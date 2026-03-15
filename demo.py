"""
Atrosha SDK — Live Demo
Run this script to see the SDK in action.
"""

import os
import sys
import time
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── colours ──────────────────────────────────────────────────────────────────
G  = "\033[92m"   # green
C  = "\033[96m"   # cyan
Y  = "\033[93m"   # yellow
W  = "\033[97m"   # white
DIM = "\033[2m"
RST = "\033[0m"
BOLD = "\033[1m"

def banner():
    print(f"""
{C}{BOLD}
  ╔═══════════════════════════════════════════╗
  ║          ATROSHA SDK  •  Live Demo        ║
  ╚═══════════════════════════════════════════╝
{RST}""")

def step(n, label):
    print(f"\n{Y}[{n}]{RST} {BOLD}{label}{RST}")
    time.sleep(0.4)

def ok(msg):
    print(f"  {G}✓{RST}  {msg}")

def info(msg):
    print(f"  {DIM}{msg}{RST}")


# ── tiny local mock proxy (so demo works offline) ─────────────────────────────
MOCK_RESPONSES = {
    "/api/agents": [
        {"id": "agt_001", "name": "payroll-bot",  "status": "active",  "budget_usd": 50000},
        {"id": "agt_002", "name": "invoice-bot",  "status": "active",  "budget_usd": 20000},
        {"id": "agt_003", "name": "expense-bot",  "status": "paused",  "budget_usd": 5000},
    ],
    "/proxy/v1/guard": {
        "permit": "permit_9xZ2kQa",
        "approved": True,
        "reason": "transaction within policy bounds",
        "signature": "ed25519:3d9f...",
    },
}

class MockHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._respond(self._get_mock_payload())

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        self.rfile.read(length)
        self._respond(self._get_mock_payload())

    def _get_mock_payload(self):
        data = MOCK_RESPONSES.get(self.path, {"error": "not found"})
        if self.path == "/proxy/v1/guard" and isinstance(data, dict):
            data = data.copy()  # avoid modifying static dict
            data["timestamp"] = int(time.time())
        return data

    def _respond(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass   # silence access logs during demo

def start_mock_server():
    server = HTTPServer(("127.0.0.1", 9999), MockHandler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server


# ── demo ──────────────────────────────────────────────────────────────────────
def main():
    banner()

    step(1, "Starting local Atrosha proxy (mock)…")
    start_mock_server()
    time.sleep(0.2)
    ok("Proxy listening on http://127.0.0.1:9999")

    step(2, "Importing SDK")
    from atrosha import Atrosha
    ok("from atrosha import Atrosha")

    step(3, "Connecting to proxy")
    client = Atrosha(
        api_key=os.getenv("ATROSHA_API_KEY", "demo-key-atrosha"),
        base_url="http://127.0.0.1:9999",
    )
    ok(f"Client initialised  →  base_url={client.base_url}")

    step(4, "Listing registered agents")
    agents = client.agents.list()
    for a in agents:
        status_colour = G if a["status"] == "active" else Y
        print(f"  {C}•{RST}  {W}{a['name']:<15}{RST}  "
              f"status={status_colour}{a['status']}{RST}  "
              f"budget=${a['budget_usd']:,}")
    ok(f"{len(agents)} agents returned")

    step(5, "Guarding a transaction (pay vendor $500)")
    result = client.transactions.guard(
        agent_id="agt_001",
        amount=50000,      # in cents
        currency="usd",
        metadata={"vendor": "AWS", "invoice": "INV-2026-0315"},
        destination="stripe:acct_1OxjKL2eZvKYlo2C",
    )
    print(f"  {C}permit  {RST}: {result['permit']}")
    print(f"  {C}approved{RST}: {G}{result['approved']}{RST}")
    print(f"  {C}reason  {RST}: {result['reason']}")
    print(f"  {C}sig     {RST}: {DIM}{result['signature']}{RST}")
    ok("Transaction approved by proxy — cryptographic permit issued")

    print(f"\n{G}{BOLD}  Demo complete.{RST}")
    print(f"  {DIM}Install: pip install atrosha-sdk{RST}")
    print(f"  {DIM}Docs:    https://atrosha.bond/docs{RST}\n")


if __name__ == "__main__":
    main()
