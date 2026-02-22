import time
import requests

VALIDATOR_URL = "https://atrosha-validator.onrender.com"
PROXY_URL = "https://atrosha.onrender.com"

def run_test():
    print("=== Atrosha E2E Production Test ===")
    
    # 1. Get Permit from Python Backend
    print("\n1. Requesting SpendPermit from Validator...")
    try:
        res = requests.post(f"{VALIDATOR_URL}/permit", json={
            "agent_id": "agent-007",
            "desc": "Transfer 10 USDC to vitalik.eth",
            "rail": "crypto",
            "ts": int(time.time())
        })
        res.raise_for_status()
        permit = res.json()["token"]
        print(f"PASS: Permit acquired! Token length: {len(permit)}")
    except Exception as e:
        print(f"FAIL: Failed to get permit: {e}")
        if 'res' in locals(): print(res.text)
        return

    # 2. Use Proxy to hit an external URL
    print("\n2. Sending transaction through Rust Proxy...")
    headers = {
        "X-Atrosha-Agent-ID": "agent-007",
        "X-Atrosha-Target": "https://jsonplaceholder.typicode.com",
        "X-Atrosha-Permit": permit,
        "X-Atrosha-Amount": "10.0",
        "X-Atrosha-Shadow-Mode": "true"
    }

    try:
        res2 = requests.post(f"{PROXY_URL}/proxy/posts", headers=headers, json={"title": "test", "body": "payload", "userId": 1}, timeout=10)
        print(f"Proxy Status: {res2.status_code}")
        print(f"Proxy Error Body: '{res2.text}'")
        if res2.status_code in [200, 201]:
            print("PASS: Proxy successfully authenticated and routed the request!")
        else:
            print(f"FAIL: Proxy rejected or failed to route request")
    except Exception as e:
        print(f"FAIL: Failed to reach proxy: {e}")

if __name__ == "__main__":
    run_test()
