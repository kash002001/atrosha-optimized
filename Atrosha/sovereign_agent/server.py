import os
import uuid
import tempfile
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from ocr import extract_invoice_data
from brain import parse_invoice_with_fallback
from tools import execute_payment
from schemas import InvoiceData, PaymentStatus, IngestResponse, VendorUpdateRequest
from db import AtroshaDB
from payroll_engine import PayrollEngine

app = FastAPI(title="Atrosha Sovereign Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = AtroshaDB()
payroll_engine = PayrollEngine(db)

# --- Auth & RBAC Logic -----------------------------------

class UserContext(BaseModel):
    username: str
    role: str
    entity_id: int

async def get_current_user(
    x_atrosha_user: str = Header("admin"),
    x_atrosha_entity: int = Header(1)
) -> UserContext:
    user = db.get_user_by_username(x_atrosha_user)
    if not user:
        raise HTTPException(401, "invalid user")
    return UserContext(username=user["username"], role=user["role"], entity_id=x_atrosha_entity)

def requires_role(roles: List[str]):
    async def role_checker(user: UserContext = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(403, f"Insufficient permissions. Required: {roles}")
        return user
    return role_checker


# ── request models ──────────────────────────────────────

class AuthorizeRequest(BaseModel):
    session_id: str
    vendor: str
    amount: float
    currency: str = "USD"
    signature: Optional[str] = None

class ExecuteRequest(BaseModel):
    vendor: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "USD"


# ── /ingest — upload and parse an invoice ───────────────

@app.post("/ingest", response_model=IngestResponse)
async def ingest(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user: UserContext = Depends(requires_role(["ADMIN", "APPROVER"]))
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "only PDF files accepted")

    # save to temp file for PyMuPDF
    suffix = ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        raw_text = extract_invoice_data(tmp_path)
    finally:
        os.unlink(tmp_path)

    if not raw_text:
        raise HTTPException(422, "could not extract text from PDF")

    parsed = parse_invoice_with_fallback(raw_text)

    # get or create session_id now instead of later
    session_id = str(uuid.uuid4())

    auto_approved = False
    needs_review = parsed.confidence.value != "high"

    # anomaly detection
    anomaly_reason = db.detect_anomalies(parsed.vendor, parsed.amount)
    msg = "extracted successfully" if not needs_review else "review recommended — some fields may be inaccurate"
    
    if anomaly_reason:
        needs_review = True
        msg = f"Review required — anomaly detected: {anomaly_reason}"

    # check vendor auto-approve threshold
    if not needs_review:
        vendor_record = db.get_vendor_by_name(parsed.vendor)
        if vendor_record:
            threshold = vendor_record.get("auto_approve_below", 0.0)
            if threshold > 0 and parsed.amount <= threshold:
                auto_approved = True
                needs_review = False
                
                # auto-lock the intent
                db.lock_intent(session_id, f"Pay {parsed.vendor} ${parsed.amount:.2f} {parsed.currency}", signature="AUTO_APPROVED")
                db.log("intent_authorized", session_id, f"vendor={parsed.vendor} amount={parsed.amount} (auto)", actor="system")

    if not auto_approved:
        db.lock_intent(session_id, f"Pending authorization for {parsed.vendor}", signature="PENDING")

    # save to db
    db.save_invoice(
        vendor=parsed.vendor, amount=parsed.amount, currency=parsed.currency,
        due_date=parsed.due_date, invoice_number=parsed.invoice_number,
        confidence=parsed.confidence.value, raw_text=raw_text, source=parsed.source,
        session_id=session_id
    )

    if auto_approved:
        db.log("invoice_ingested", session_id, detail=f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value} (auto-approved)")
        background_tasks.add_task(dispatch_webhooks, "invoice_ingested", session_id, f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value} (auto-approved)")
    else:
        db.log("invoice_ingested", session_id, detail=f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value}")
        background_tasks.add_task(dispatch_webhooks, "invoice_ingested", session_id, f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value}")

    return IngestResponse(invoice=parsed, needs_review=needs_review, auto_approved=auto_approved, session_id=session_id, message=msg)

@app.post("/ingest/batch", response_model=List[IngestResponse])
async def ingest_batch(
    background_tasks: BackgroundTasks, 
    files: List[UploadFile] = File(...),
    user: UserContext = Depends(requires_role(["ADMIN", "APPROVER"]))
):
    results = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue
            
        suffix = ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        try:
            raw_text = extract_invoice_data(tmp_path)
        except Exception:
            raw_text = ""
        finally:
            os.unlink(tmp_path)

        if not raw_text:
            continue

        parsed = parse_invoice_with_fallback(raw_text)
        session_id = str(uuid.uuid4())
        auto_approved = False
        needs_review = parsed.confidence.value != "high"

        # anomaly detection
        anomaly_reason = db.detect_anomalies(parsed.vendor, parsed.amount)
        if anomaly_reason:
            needs_review = True
            msg = f"Review required — anomaly detected: {anomaly_reason}"

        if not needs_review:
            vendor_record = db.get_vendor_by_name(parsed.vendor)
            if vendor_record:
                threshold = vendor_record.get("auto_approve_below", 0.0)
                if threshold > 0 and parsed.amount <= threshold:
                    auto_approved = True
                    needs_review = False
                    db.lock_intent(session_id, f"Pay {parsed.vendor} ${parsed.amount:.2f} {parsed.currency}", signature="AUTO_APPROVED")
                    db.log("intent_authorized", session_id, f"vendor={parsed.vendor} amount={parsed.amount} (auto)", actor="system")
                    background_tasks.add_task(dispatch_webhooks, "intent_authorized", session_id, f"vendor={parsed.vendor} amount={parsed.amount} (auto)")

        if not auto_approved:
            db.lock_intent(session_id, f"Pending authorization for {parsed.vendor}", signature="PENDING")

        db.save_invoice(
            vendor=parsed.vendor, amount=parsed.amount, currency=parsed.currency,
            due_date=parsed.due_date, invoice_number=parsed.invoice_number,
            confidence=parsed.confidence.value, raw_text=raw_text, source=parsed.source,
            session_id=session_id
        )

        if auto_approved:
            db.log("invoice_ingested", session_id, detail=f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value} (auto-approved)")
            background_tasks.add_task(dispatch_webhooks, "invoice_ingested", session_id, f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value} (auto-approved)")
        else:
            db.log("invoice_ingested", session_id, detail=f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value}")
            background_tasks.add_task(dispatch_webhooks, "invoice_ingested", session_id, f"vendor={parsed.vendor} amount={parsed.amount} conf={parsed.confidence.value}")

        msg = "extracted successfully" if not needs_review else "review recommended"
        if auto_approved:
            msg = "auto-approved based on vendor threshold"
        
        results.append(IngestResponse(invoice=parsed, needs_review=needs_review, auto_approved=auto_approved, session_id=session_id, message=msg))
    
    return results



# ── /authorize — lock an approved intent ────────────────

@app.post("/authorize")
async def authorize_intent(
    background_tasks: BackgroundTasks, 
    req: AuthorizeRequest,
    user: UserContext = Depends(requires_role(["ADMIN", "APPROVER"]))
):
    db.lock_intent(req.session_id, f"Pay {req.vendor} ${req.amount:.2f} {req.currency}", signature=req.signature or "", entity_id=user.entity_id)
    db.log("intent_authorized", req.session_id, f"vendor={req.vendor} amount={req.amount}", actor=user.username, entity_id=user.entity_id)
    background_tasks.add_task(dispatch_webhooks, "intent_authorized", req.session_id, f"vendor={req.vendor} amount={req.amount}", entity_id=user.entity_id)
    return {"session_id": req.session_id, "status": "authorized"}


# ── /execute — run payment through kernel ───────────────

@app.post("/execute/{session_id}")
async def execute(
    session_id: str, 
    req: ExecuteRequest = None,
    user: UserContext = Depends(requires_role(["ADMIN", "APPROVER"]))
):
    intent = db.get_intent(session_id)
    if not intent:
        raise HTTPException(404, "no authorized intent for this session")

    # if vendor/amount not provided, try to parse from the intent prompt
    vendor = req.vendor if req and req.vendor else "Unknown"
    amount = req.amount if req and req.amount else 0.0

    if vendor == "Unknown" or amount == 0.0:
        raise HTTPException(400, "vendor and amount required")

    result = execute_payment(vendor, amount, session_id, currency=req.currency if req else "USD")
    return result


# ── /invoices — list processed invoices ─────────────────

@app.get("/invoices")
async def list_invoices(limit: int = 50, user: UserContext = Depends(get_current_user)):
    return db.list_invoices(limit, entity_id=user.entity_id)


# ── /audit — full audit trail ───────────────────────────

@app.get("/audit")
async def audit_log(limit: int = 100, event_type: str = None, user: UserContext = Depends(get_current_user)):
    return db.get_audit_log(limit, event_type, entity_id=user.entity_id)


# ── /vendors — known vendors ───────────────────────────

@app.get("/vendors")
async def list_vendors(user: UserContext = Depends(get_current_user)):
    return db.list_vendors(entity_id=user.entity_id)

@app.put("/vendors/{vendor_id}")
async def update_vendor(
    background_tasks: BackgroundTasks, 
    vendor_id: int, 
    req: VendorUpdateRequest,
    user: UserContext = Depends(requires_role(["ADMIN"]))
):
    vendor = db.get_vendor(vendor_id, entity_id=user.entity_id)
    if not vendor:
        raise HTTPException(404, "vendor not found")
    db.update_vendor_threshold(vendor_id, req.auto_approve_below, entity_id=user.entity_id)
    db.log("vendor_updated", detail=f"vendor_id={vendor_id} threshold={req.auto_approve_below}", actor=user.username, entity_id=user.entity_id)
    background_tasks.add_task(dispatch_webhooks, "vendor_updated", None, f"vendor_id={vendor_id} threshold={req.auto_approve_below}", entity_id=user.entity_id)
    return {"status": "success", "vendor_id": vendor_id, "auto_approve_below": req.auto_approve_below}


# ── /stats — dashboard numbers ──────────────────────────

@app.get("/stats")
async def stats(user: UserContext = Depends(get_current_user)):
    return db.stats(entity_id=user.entity_id)


from fastapi.responses import StreamingResponse
import io
import csv

# ── /export — accounting sync ───────────────────────────

@app.get("/export/csv/xero")
async def export_xero(user: UserContext = Depends(get_current_user)):
    invoices = db.list_invoices(1000, entity_id=user.entity_id)
    # ... rest of export logic remains same ...
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["*ContactName", "*InvoiceNumber", "*InvoiceDate", "*DueDate", "*Description", "*Quantity", "*UnitAmount", "*AccountCode", "*TaxType"])
    for inv in invoices:
        writer.writerow([
            inv['vendor'],
            inv['invoice_number'] or f"INV-{inv['id']}",
            inv['created_at'][:10],
            inv['due_date'] or inv['created_at'][:10],
            "Sovereign AP Auto-Payment",
            "1",
            inv['amount'],
            "400",
            "Tax Exempt"
        ])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=xero_export.csv"})

@app.get("/export/csv/quickbooks")
async def export_qb():
    invoices = db.list_invoices(1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Vendor", "BillNo", "BillDate", "DueDate", "Memo", "ExpenseAmount", "ExpenseAccount"])
    for inv in invoices:
        writer.writerow([
            inv['vendor'],
            inv['invoice_number'] or f"BILL-{inv['id']}",
            inv['created_at'][:10],
            inv['due_date'] or inv['created_at'][:10],
            "Sovereign AP Auto-Payment",
            inv['amount'],
            "Accounts Payable"
        ])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=quickbooks_export.csv"})


import httpx
from fastapi import BackgroundTasks
from pydantic import BaseModel

class WebhookCreate(BaseModel):
    url: str

@app.post("/webhooks")
async def add_webhook(info: WebhookCreate, user: UserContext = Depends(requires_role(["ADMIN"]))):
    return db.add_webhook(info.url, entity_id=user.entity_id)

@app.get("/webhooks")
async def list_webhooks(user: UserContext = Depends(get_current_user)):
    return db.list_webhooks(entity_id=user.entity_id)

@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: int, user: UserContext = Depends(requires_role(["ADMIN"]))):
    db.delete_webhook(webhook_id, entity_id=user.entity_id)
    return {"status": "ok"}

async def dispatch_webhooks(event_type: str, session_id: str, detail: str, entity_id: int = 1):
    webhooks = db.list_webhooks(entity_id=entity_id)
    if not webhooks:
        return
    payload = {"event_type": event_type, "session_id": session_id, "detail": detail}
    async with httpx.AsyncClient() as client:
        for wh in webhooks:
            try:
                await client.post(wh["url"], json=payload, timeout=5.0)
            except Exception:
                pass  # Best effort delivery


# ── /users & /entities ──────────────────────────────────

@app.get("/entities")
async def list_entities(user: UserContext = Depends(requires_role(["ADMIN"]))):
    return db.list_entities()

@app.get("/users/me")
async def get_me(user: UserContext = Depends(get_current_user)):
    return user

@app.post("/users")
async def create_user(username: str, role: str, user: UserContext = Depends(requires_role(["ADMIN"]))):
    return db.add_user(username, role)

@app.get("/health")
async def health():
    try:
        s = db.stats()
        return {"status": "healthy", "db": True, **s}
    except Exception as e:
        return {"status": "degraded", "db": False, "error": str(e)}


@app.get("/agents")
async def get_agents(ctx: UserContext = Depends(get_current_user)):
    return db.list_agents(ctx.entity_id)

@app.post("/agents")
@requires_role(["ADMIN"])
async def create_agent(agent: dict, ctx: UserContext = Depends(get_current_user)):
    import uuid
    agent_id = str(uuid.uuid4())
    db.add_agent(agent_id, agent["name"], ctx.entity_id)
    db.log("agent_created", f"Agent {agent['name']} created", ctx.entity_id, ctx.username)
    return {"id": agent_id, "name": agent["name"], "_privateKey": f"atrosha_sk_{uuid.uuid4().hex}"}

@app.get("/rules")
async def get_rules(ctx: UserContext = Depends(get_current_user)):
    rules = db.list_rules(ctx.entity_id)
    for r in rules:
        if r.get("compiled_policy"):
            try:
                import json
                r["compiled_policy"] = json.loads(r["compiled_policy"])
            except:
                pass
    return rules

@app.post("/rules")
@requires_role(["ADMIN", "APPROVER"])
async def create_rule(rule: dict, ctx: UserContext = Depends(get_current_user)):
    db.add_rule(rule["nl_text"], rule["compiled_policy"], rule.get("agent_id"), ctx.entity_id)
    db.log("rule_created", f"Rule added: {rule['nl_text']}", ctx.entity_id, ctx.username)
    return {"status": "success"}

@app.delete("/rules/{rule_id}")
@requires_role(["ADMIN"])
async def delete_rule(rule_id: int, ctx: UserContext = Depends(get_current_user)):
    db.delete_rule(rule_id, ctx.entity_id)
    db.log("rule_deleted", f"Rule {rule_id} deleted", ctx.entity_id, ctx.username)
    return {"status": "success"}

@app.get("/transactions")
async def get_transactions(ctx: UserContext = Depends(get_current_user)):
    return db.list_executions(ctx.entity_id)

@app.post("/audit/verify")
@requires_role(["ADMIN", "AUDITOR"])
async def verify_audit(ctx: UserContext = Depends(get_current_user)):
    return db.verify_audit_chain(ctx.entity_id)

@app.get("/auth/settings")
@requires_role(["ADMIN"])
async def get_auth_settings(ctx: UserContext = Depends(get_current_user)):
    return db.get_auth_settings(ctx.entity_id)

@app.post("/auth/settings")
@requires_role(["ADMIN"])
async def add_auth_settings(settings: dict, ctx: UserContext = Depends(get_current_user)):
    db.add_auth_settings(
        ctx.entity_id,
        settings["provider_type"],
        settings.get("metadata_url"),
        settings.get("client_id"),
        settings.get("client_secret"),
        settings.get("redirect_uri")
    )
    db.log("auth_settings_updated", f"Updated {settings['provider_type']} settings", ctx.entity_id, ctx.username)
    return {"status": "success"}

@app.delete("/auth/settings/{settings_id}")
@requires_role(["ADMIN"])
async def delete_auth_settings(settings_id: int, ctx: UserContext = Depends(get_current_user)):
    db.delete_auth_settings(settings_id, ctx.entity_id)
    db.log("auth_settings_deleted", f"Deleted auth settings {settings_id}", ctx.entity_id, ctx.username)
    return {"status": "success"}

@app.post("/auth/callback")
async def auth_callback(payload: dict):
    # Mock SAML/OIDC callback logic
    # In a real production system, this would validate the SAML Response / OIDC ID Token
    # and create a session for the user.
    return {"status": "authorized", "user": "sso_user", "role": "APPROVER"}

# ── expenses ────────────────────────────────────────

@app.get("/expenses")
async def get_expenses(ctx: UserContext = Depends(get_current_user)):
    return db.list_expenses(ctx.entity_id)

@app.post("/expenses/upload")
async def upload_receipt(
    file: UploadFile, 
    ctx: UserContext = Depends(get_current_user)
):
    import os
    import shutil
    from uuid import uuid4
    
    upload_dir = "sovereign_agent/uploads/receipts"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1]
    file_name = f"{uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Mock OCR Extraction
    # In a real system, we'd trigger a local Tesseract or PaddleOCR process here
    # For now, we seed with pending data to be edited by the user
    db.add_expense(
        ctx.entity_id,
        "Unknown Vendor", # Extracted via OCR later
        0.00,             # Extracted via OCR later
        None,             # Extracted via OCR later
        file_path
    )
    
    db.log("expense_uploaded", f"Receipt {file.filename} uploaded", ctx.entity_id, ctx.username)
    return {"status": "success", "file_path": file_path}

@app.patch("/expenses/{expense_id}")
@requires_role(["ADMIN", "APPROVER"])
async def update_expense(expense_id: int, update: dict, ctx: UserContext = Depends(get_current_user)):
    # Basic status update or manual override
    db.update_expense_status(expense_id, update.get("status", "pending_match"), update.get("matched_tx_id"))
    return {"status": "success"}

@app.get("/payroll/history/{employee_id}")
async def get_payroll_history(employee_id: int, ctx: UserContext = Depends(get_current_user)):
    return db.get_employee_payroll_history(employee_id, ctx.entity_id)

@app.post("/payroll/verify")
@requires_role(["ADMIN", "APPROVER"])
async def verify_payroll(draft: List[dict], ctx: UserContext = Depends(get_current_user)):
    # draft: [{"employee_id": 1, "amount": 5000, "period": "2026-03"}]
    analysis = payroll_engine.analyze_draft(ctx.entity_id, draft)
    return analysis

@app.post("/payroll/approve")
@requires_role(["ADMIN", "APPROVER"])
async def approve_payroll(records: List[dict], ctx: UserContext = Depends(get_current_user)):
    for rec in records:
        db.add_payroll_record(
            ctx.entity_id,
            rec["employee_id"],
            rec["amount"],
            rec["period"]
        )
        db.log("payroll_approved", f"Payroll for {rec['employee_id']} ({rec['period']}) approved", ctx.entity_id, ctx.username)
    return {"status": "success", "count": len(records)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AGENT_PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
