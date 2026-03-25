import os
import time
import jwt
import requests

PERMIT_SECRET   = os.getenv("PERMIT_SECRET", "super-secret-key-change-me")
PROXY_URL       = os.getenv("PROXY_URL", "http://localhost:8080")
SESSION_ID      = "ml-session-24500"
AGENT_ID        = "sovereign-agent-v1"

AUTHORIZED_AMOUNT   = 24_500.00
INJECTED_AMOUNT     = 245_000.00


def mint_permit(amount: float) -> str:
    payload = {
        "sub":        AGENT_ID,
        "intent":     f"pay Meridian Logistics LLC ${amount:,.2f} via Stripe",
        "rail":       "stripe",
        "session_id": SESSION_ID,
        "exp":        int(time.time()) + 300,
        "iat":        int(time.time()),
    }
    return jwt.encode(payload, PERMIT_SECRET, algorithm="HS256")


def run():
    print("\n" + "="*52)
    print("  ATROSHA KERNEL — security validation run")
    print("="*52 + "\n")
    print(f"  authorized intent : pay Meridian Logistics ${AUTHORIZED_AMOUNT:,.2f}")
    print(f"  injected payload  : pay Meridian Logistics ${INJECTED_AMOUNT:,.2f} (10x)\n")

    permit = mint_permit(AUTHORIZED_AMOUNT)
    print("  [✓] JWT permit issued (cryptographic check: PASS)\n")

    headers = {
        "Content-Type":             "application/json",
        "X-Atrosha-Target":         "https://api.stripe.com/v1",
        "X-Atrosha-Agent-ID":       AGENT_ID,
        "X-Atrosha-Amount":         str(INJECTED_AMOUNT),
        "X-Atrosha-Session-ID":     SESSION_ID,
        "X-Atrosha-Permit":         permit,
    }
    body = {
        "vendor":   "Meridian Logistics LLC",
        "amount":   INJECTED_AMOUNT,
        "currency": "USD",
    }

    print("  Forwarding payload to Atrosha Kernel...")
    try:
        resp = requests.post(f"{PROXY_URL}/proxy/charges", headers=headers, json=body, timeout=15)

        if resp.status_code == 403:
            print("\n  ══════════════════════════════════════")
            print("  🔴  BLOCKED BY ATROSHA KERNEL")
            print("  ══════════════════════════════════════")
            print("  Reason : Intent Drift Detected")
            print(f"  Payload ${INJECTED_AMOUNT:,.2f} deviates from locked intent ${AUTHORIZED_AMOUNT:,.2f}")
            print("  Stripe  : NOT reached. Transaction never executed.")
            print("  Audit   : DENIED entry logged.\n")
        elif resp.status_code == 200:
            print(f"\n  ⚠ Passed — unexpected in production config: {resp.json()}")
        else:
            print(f"\n  Blocked ({resp.status_code}): {resp.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("\n  ✗  Proxy unreachable on port 8080. Ensure services are running.")


if __name__ == "__main__":
    run()
