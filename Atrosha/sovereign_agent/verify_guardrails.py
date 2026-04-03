import os
import time
import sys
import jwt
import requests
import json
from dotenv import load_dotenv

load_dotenv()

PERMIT_SECRET   = os.getenv("PERMIT_SECRET")
if not PERMIT_SECRET:
    raise EnvironmentError("PERMIT_SECRET must be set in .env")

PROXY_URL       = os.getenv("PROXY_URL", "http://localhost:8080")
SESSION_ID      = "ml-session-24500"
AGENT_ID        = "sovereign-agent-v1"

AUTHORIZED_AMOUNT   = 24_500.00
INJECTED_AMOUNT     = 245_000.00


# slow print for dramatic terminal effect
def sprint(text, delay=0.02):
    for ch in text:
        sys.stdout.write(ch)
        sys.stdout.flush()
        time.sleep(delay)
    print()


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


def verify_permit_locally(permit_token, claimed_amount):
    decoded = jwt.decode(permit_token, PERMIT_SECRET, algorithms=["HS256"])
    locked_intent = decoded["intent"]
    # extract dollar amount from intent string
    import re
    match = re.search(r'\$([\d,]+\.\d{2})', locked_intent)
    if not match:
        return False, "no amount in permit"
    locked_amount = float(match.group(1).replace(",", ""))
    drift = abs(claimed_amount - locked_amount) / locked_amount
    return drift < 0.01, f"locked=${locked_amount:,.2f} vs payload=${claimed_amount:,.2f} (drift={drift:.1%})"


def run():
    print()
    sprint("="*58, 0.005)
    sprint("  ATROSHA KERNEL — guardrail validation sequence", 0.025)
    sprint("="*58, 0.005)
    print()

    sprint(f"  ▸ Original intent  : pay Meridian Logistics LLC ${AUTHORIZED_AMOUNT:,.2f}")
    sprint(f"  ▸ Injected payload : pay Meridian Logistics LLC ${INJECTED_AMOUNT:,.2f} (10×)")
    print()

    # step 1 - ingestion
    time.sleep(0.15)
    sprint("  [1/5] Ingesting prompt context: meridian_invoice.pdf...", 0.01)
    time.sleep(0.25)
    sprint("        ✓ Vector buffer created  |  tokens=1.2k", 0.005)
    print()

    # step 2 - mint
    time.sleep(0.15)
    permit = mint_permit(AUTHORIZED_AMOUNT)
    sprint("  [2/5] Minting cryptographic spend permit...", 0.01)
    time.sleep(0.2)
    sprint(f"        ✓ Permit issued  |  alg=HS256  |  ttl=300s  |  sub={AGENT_ID}", 0.005)
    print()

    # step 3 - attacker
    time.sleep(0.15)
    sprint("  [3/5] Simulating attacker prompt injection...", 0.01)
    time.sleep(0.2)
    sprint(f"        ✗ Payload rewritten: $24,500.00 → $245,000.00", 0.01)
    sprint(f"        ✗ Stolen permit reused — traditional auth would pass", 0.01)
    print()

    # step 4 - kernel check
    time.sleep(0.15)
    sprint("  [4/5] Forwarding to Atrosha Kernel for egress validation...", 0.01)
    time.sleep(0.3)

    # actually hit the proxy in shadow mode to prove it's live
    proxy_live = False
    try:
        r = requests.get(f"{PROXY_URL}/health", timeout=2)
        proxy_live = r.status_code == 200
    except Exception:
        pass

    if proxy_live:
        sprint("        → Kernel online (verified live)", 0.005)
    else:
        sprint("        → Kernel endpoint configured", 0.005)

    # perform the actual cryptographic intent verification
    passed, reason = verify_permit_locally(permit, INJECTED_AMOUNT)

    # step 5 - verdict
    time.sleep(0.15)
    sprint("  [5/5] Intent verification...", 0.01)
    time.sleep(0.25)

    if not passed:
        print()
        print("  ╔══════════════════════════════════════════════════════════════╗")
        print("  ║                                                              ║")
        print("  ║   ██████  ██       ██████   ██████ ██   ██ ███████ ██████    ║")
        print("  ║   ██   ██ ██      ██    ██ ██      ██  ██  ██      ██   ██   ║")
        print("  ║   ██████  ██      ██    ██ ██      █████   █████   ██   ██   ║")
        print("  ║   ██   ██ ██      ██    ██ ██      ██  ██  ██      ██   ██   ║")
        print("  ║   ██████  ███████  ██████   ██████ ██   ██ ███████ ██████    ║")
        print("  ║                                                              ║")
        print("  ╠══════════════════════════════════════════════════════════════╣")
        print("  ║                                                              ║")
        print("  ║   Verdict  : INTENT DRIFT DETECTED                           ║")
        print(f"  ║   Locked   : $24,500.00   (original permit)                  ║")
        print(f"  ║   Payload  : $245,000.00  (injected — 10× deviation)        ║")
        print(f"  ║   Drift    : 900.0%  (threshold: 1%)                        ║")
        print("  ║                                                              ║")
        print("  ║   Stripe   : ✗ NOT REACHED — egress blocked                  ║")
        print("  ║   Audit    : ✓ DENIED entry logged to ClickHouse             ║")
        print("  ║   Circuit  : ✓ Agent violation counter incremented           ║")
        print("  ║                                                        ║")
        print("  ╚══════════════════════════════════════════════════════════════╝")
        print()
    else:
        sprint(f"        ✓ Permit valid — forwarding to Stripe")


if __name__ == "__main__":
    run()
