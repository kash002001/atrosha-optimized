import os
import uuid
from datetime import datetime, timedelta
import requests

# Supabase config
SUPABASE_URL = "https://kyocxszsoqwgtqglfmmh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5b2N4c3pzb3F3Z3RxZ2xmbW1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjEyOTkxNiwiZXhwIjoyMDgxNzA1OTE2fQ.l3EQkHDVg7DT5MFe4_2hTQTsoHQIE5itI8n14SsJJXU"

# Seeding both potential demo organizations
ORG_IDS = ["1ce1540a-6db3-4405-ae8c-f038d622f43e", "9386b0e2-cf03-4e5e-a0d7-45485816f4e2"]

def seed():
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    for org_id in ORG_IDS:
        print(f"Seeding Org: {org_id}...")
        
        # 1. Agent
        agent = {
            "name": "Sovereign Logistics Agent",
            "organization_id": org_id,
            "pubkey": f"demo-key-{org_id[:8]}",
            "daily_limit_cents": 10000000,
            "per_tx_limit_cents": 5000000,
            "is_active": True
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/agents", headers=headers, json=agent)

        # 2. Transactions
        transactions = [
            {
                "id": str(uuid.uuid4()),
                "organization_id": org_id,
                "agent_id": "sovereign-agent-v1",
                "amount": 2450000,
                "currency": "USD",
                "status": "approved",
                "destination": "Meridian Logistics LLC (Stripe)",
                "created_at": (datetime.now() - timedelta(minutes=15)).isoformat(),
                "sim_score": 0.98,
                "latency_ms": 42.5,
                "payload_preview": "{\"vendor\": \"Meridian Logistics LLC\", \"amount\": 24500.0}"
            },
            {
                "id": str(uuid.uuid4()),
                "organization_id": org_id,
                "agent_id": "sovereign-agent-v1",
                "amount": 24500000,
                "currency": "USD",
                "status": "denied",
                "destination": "Meridian Logistics LLC (Payload Injection Attack)",
                "created_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "sim_score": 0.12,
                "latency_ms": 38.2,
                "denial_reason": "Intent Drift detected by Atrosha Kernel",
                "verdict_confidence": 0.99,
                "verdict_source": "semantic_v3",
                "verdict_reason": "deny",
                "payload_preview": "{\"vendor\": \"Meridian Logistics LLC\", \"amount\": 245000.0}"
            }
        ]
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/transactions", headers=headers, json=transactions)
        if resp.status_code >= 400:
            print(f"Error seeding {org_id}: {resp.text}")

        # 3. Rule
        rule = {
            "organization_id": org_id,
            "nl_text": "Block unusual transaction spikes or payload mismatches.",
            "effect": "deny",
            "status": "active"
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/rules", headers=headers, json=rule)

    print("\n[SUCCESS] Seeded both organizations with demo data.")

if __name__ == "__main__":
    seed()
