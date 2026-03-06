import hashlib
import requests
from schemas import PaymentStatus
from db import AtroshaDB

PROXY_URL = "http://localhost:8080"  # atrosha kernel

db = AtroshaDB()


def _idempotency_key(session_id: str, vendor: str, amount: float) -> str:
    raw = f"{session_id}:{vendor}:{amount:.2f}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def execute_payment(vendor: str, amount: float, session_id: str, currency: str = "USD") -> dict:
    idem_key = _idempotency_key(session_id, vendor, amount)

    # check for existing execution (prevents double-payments)
    existing = db.get_execution(idem_key)
    if existing and existing["status"] in ("submitted", "confirmed"):
        return {
            "status": existing["status"],
            "tx_ref": existing.get("tx_ref"),
            "reason": "idempotent: already processed",
            "idempotency_key": idem_key,
        }

    # record attempt
    db.save_execution(session_id, idem_key, vendor, amount, PaymentStatus.SUBMITTED.value)

    url = f"{PROXY_URL}/proxy/charges"
    headers = {
        "Content-Type": "application/json",
        "X-Atrosha-Target": "https://api.stripe.com/v1",
        "X-Atrosha-Agent-ID": "sovereign-agent-v1",
        "X-Atrosha-Amount": str(amount),
        "X-Atrosha-Session-ID": session_id,
        "X-Idempotency-Key": idem_key,
        "X-Atrosha-Permit": "eyJhZ2VudF9pZCI6ImFnZW50LTAwNyIsImFtb3VudCI6MSwiaW50ZW50X2hhc2giOm51bGwsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzM4NDE3NTA4fQ.signature",
    }

    payload = {"vendor": vendor, "amount": amount, "currency": currency}

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=15)

        if resp.status_code == 200:
            tx_ref = resp.json().get("tx_ref", f"tx_{idem_key[:8]}")
            db.update_execution_status(idem_key, PaymentStatus.CONFIRMED.value, tx_ref=tx_ref)
            return {"status": "confirmed", "tx_ref": tx_ref, "idempotency_key": idem_key}

        elif resp.status_code == 403:
            db.update_execution_status(idem_key, PaymentStatus.BLOCKED.value, reason="intent drift detected")
            return {"status": "blocked", "reason": "Atrosha Kernel blocked: Intent Drift", "idempotency_key": idem_key}

        else:
            db.update_execution_status(idem_key, PaymentStatus.FAILED.value, reason=resp.text[:200])
            return {"status": "failed", "reason": resp.text[:200], "idempotency_key": idem_key}

    except requests.exceptions.ConnectionError:
        db.update_execution_status(idem_key, PaymentStatus.FAILED.value, reason="kernel offline")
        return {"status": "failed", "reason": "Atrosha Kernel is not running on port 8080", "idempotency_key": idem_key}


if __name__ == "__main__":
    print(execute_payment("Cloudflare", 500.0, "test_session"))
