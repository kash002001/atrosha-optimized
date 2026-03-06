import sys
from ocr import extract_invoice_data
from brain import parse_invoice_with_fallback
from tools import execute_payment
from db import AtroshaDB

db = AtroshaDB()


def run_agent_loop(invoice_path: str, session_id: str, auto_confirm: bool = False):
    print(f"\n{'='*50}")
    print(f"  SOVEREIGN AGENT — Processing Invoice")
    print(f"{'='*50}\n")

    # step 1: local ocr
    print("[1/4] Zero-Knowledge Ingestion...")
    raw_text = extract_invoice_data(invoice_path)
    if not raw_text:
        print("FAILED: could not read invoice.")
        db.log("ingest_failed", session_id, f"path={invoice_path}")
        return None

    print(f"     extracted {len(raw_text)} chars of text\n")

    # step 2: deterministic parsing
    print("[2/4] Deterministic Invoice Parsing...")
    parsed = parse_invoice_with_fallback(raw_text)
    print(f"     vendor  = {parsed.vendor}")
    print(f"     amount  = ${parsed.amount:.2f}")
    print(f"     due     = {parsed.due_date or 'N/A'}")
    print(f"     inv#    = {parsed.invoice_number or 'N/A'}")
    print(f"     conf    = {parsed.confidence.value} ({parsed.source})\n")

    # save invoice to db
    inv_id = db.save_invoice(
        vendor=parsed.vendor, amount=parsed.amount, currency=parsed.currency,
        due_date=parsed.due_date, invoice_number=parsed.invoice_number,
        confidence=parsed.confidence.value, raw_text=raw_text,
        source=parsed.source, session_id=session_id,
    )

    # step 3: human confirmation
    print("[3/4] Human Review Required")
    if parsed.confidence.value == "low":
        print("     ⚠ LOW CONFIDENCE — manual review strongly recommended")

    if not auto_confirm:
        confirm = input(f"\n     Authorize ${parsed.amount:.2f} to '{parsed.vendor}'? (y/n): ").strip().lower()
        if confirm != "y":
            print("     ✗ Payment rejected by operator.")
            db.log("payment_rejected", session_id, f"vendor={parsed.vendor} amount={parsed.amount}")
            return {"status": "rejected", "reason": "operator rejected"}
    else:
        print("     auto-confirm enabled, proceeding...\n")

    # step 4: execute via kernel
    print("[4/4] Executing via Atrosha Kernel...")
    result = execute_payment(parsed.vendor, parsed.amount, session_id)

    status_icon = "✓" if result["status"] == "confirmed" else "✗"
    print(f"\n     {status_icon} Result: {result['status']}")
    if result.get("tx_ref"):
        print(f"     tx_ref: {result['tx_ref']}")
    if result.get("reason"):
        print(f"     reason: {result['reason']}")

    print(f"\n{'='*50}\n")
    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python loop.py <invoice_pdf> <session_id> [--auto]")
    else:
        auto = "--auto" in sys.argv
        run_agent_loop(sys.argv[1], sys.argv[2], auto_confirm=auto)
