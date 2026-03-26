import hashlib
import requests  # type: ignore
import os
from schemas import PaymentStatus  # type: ignore
from db import AtroshaDB  # type: ignore

from dotenv import load_dotenv

load_dotenv()
PROXY_URL = os.getenv("PROXY_URL", "http://localhost:8080")
STRIPE_KEY = os.getenv("STRIPE_API_KEY")

db = AtroshaDB()


def _idempotency_key(session_id: str, vendor: str, amount: float) -> str:
    raw = f"{session_id}:{vendor}:{amount:.2f}"
    digest: str = hashlib.sha256(raw.encode()).hexdigest()
    return digest[:32]


def execute_payment(vendor: str, amount: float, session_id: str, permit: str, currency: str = "USD") -> dict:
    idem_key = _idempotency_key(session_id, vendor, amount)

    existing = db.get_execution(idem_key)
    if existing and existing["status"] in ("submitted", "confirmed"):
        return {
            "status": existing["status"],
            "tx_ref": existing.get("tx_ref"),
            "reason": "idempotent: already processed",
            "idempotency_key": idem_key,
        }

    db.save_execution(session_id, idem_key, vendor, amount, PaymentStatus.SUBMITTED.value)

    url = f"{PROXY_URL}/proxy/charges"
    headers = {
        "Content-Type": "application/json",
        "X-Atrosha-Target": "https://api.stripe.com/v1/charges",  # Specific endpoint
        "X-Atrosha-Agent-ID": "sovereign-agent-v1",
        "X-Atrosha-Amount": str(amount),
        "X-Atrosha-Session-ID": session_id,
        "X-Idempotency-Key": idem_key,
        "X-Atrosha-Permit": permit,
    }

    if STRIPE_KEY:
        headers["Authorization"] = f"Bearer {STRIPE_KEY}"

    payload = {"vendor": vendor, "amount": amount, "currency": currency}

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=15)

        if resp.status_code == 200:
            key_slice: str = idem_key[:8]  # type: ignore
            tx_ref = resp.json().get("tx_ref", f"tx_{key_slice}")
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
    print(execute_payment("Cloudflare", 500.0, "test_session", permit="mock-permit-token"))
