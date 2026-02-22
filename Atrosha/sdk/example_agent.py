from client import atroshaclient
import time
import requests

def run_verification():
    print("[?] Verifying SDK Agent Identity Support...\n")

    # TEST 1: Registered/Fallback Agent (agent-007)
    # This simulates a correctly onboarded agent.
    print("--- Test 1: Authenticated Agent (agent-007) ---")
    agent = atroshaclient(url="https://atrosha-validator.onrender.com", proxy="https://atrosha.onrender.com", agent_id="agent-007")
    
    # NOTE: The real execute endpoint expects a relative path which the proxy prepends to the Target URL.
    # To test proxy routing, we will override the Target Header in the client temporarily.
    agent.session = requests.Session()
    
    print(f"Identity: {agent.agent_id}")
    
    permit = agent.getpermit("authorized purchase", rail="stripe")
    if permit:
        print(f"[+] Permit Acquired")
        try:
            # Overriding target for E2E testing
            original_execute = agent.execute
            
            # The client.py hardcodes Target to httpbin. We need to patch the execute method.
            def mock_execute(permit, action, params=None):
                import json
                timestamp = str(int(time.time()))
                body_bytes = json.dumps(params).encode()
                sig_payload = timestamp.encode() + b"." + body_bytes
                signature = agent.privkey.sign(sig_payload)
                
                headers = {
                    "X-Atrosha-Permit": permit,
                    "X-Atrosha-Agent-ID": agent.agent_id,
                    "X-Atrosha-Target": "https://jsonplaceholder.typicode.com",
                    "X-Atrosha-Timestamp": timestamp,
                    "X-Atrosha-Signature": signature.hex(),
                    "Content-Type": "application/json",
                }
                
                # Use /proxy/posts instead of /proxy/execute/refund
                url = f"{agent.proxy}/proxy/posts"
                return agent.session.post(url, data=body_bytes, headers=headers, timeout=10)
                
            agent.execute = mock_execute
            
            resp = agent.execute(permit, "posts", {"title": "sdk_test", "body": "works"})
            print(f"[+] Execution Status: {resp.status_code} (Expected 201)")
            print(f"[+] Response Body: {resp.text}\n")
            
        except Exception as e:
            print(f"[-] Execution Failed: {e}\n")
    else:
        print("[-] Failed to get permit\n")

    # TEST 2: Unregistered New Agent
    # This simulates a new agent trying to use the system without registration.
    # The Proxy should BLOCK this (401 Unauthorized) because it doesn't know the key.
    print("--- Test 2: Unregistered Agent (unknown-bot-v1) ---")
    agent2 = atroshaclient(url="https://atrosha-validator.onrender.com", proxy="https://atrosha.onrender.com", agent_id="unknown-bot-v1")
    agent2.session = requests.Session()
    
    print(f"Identity: {agent2.agent_id}")
    
    # Note: Validator might issue permit (it verifies Budget/Policy, not Keys in offline mode)
    permit2 = agent2.getpermit("unauthorized purchase", rail="stripe")
    if permit2:
        print(f"[!] Permit Acquired (Validator is permissive in demo)")
        try:
            # Override execute for Test 2 similarly
            def mock_execute2(permit, action, params=None):
                import json
                timestamp = str(int(time.time()))
                body_bytes = json.dumps(params).encode()
                sig_payload = timestamp.encode() + b"." + body_bytes
                signature = agent2.privkey.sign(sig_payload)
                
                headers = {
                    "X-Atrosha-Permit": permit,
                    "X-Atrosha-Agent-ID": agent2.agent_id,
                    "X-Atrosha-Target": "https://jsonplaceholder.typicode.com",
                    "X-Atrosha-Timestamp": timestamp,
                    "X-Atrosha-Signature": signature.hex(),
                    "Content-Type": "application/json",
                }
                
                url = f"{agent2.proxy}/proxy/posts"
                return agent2.session.post(url, data=body_bytes, headers=headers, timeout=10)
                
            agent2.execute = mock_execute2

            resp2 = agent2.execute(permit2, "posts", {"title": "fail", "body": "test"})
            if resp2.status_code == 401:
                 print(f"[+] Security Check Passed: Proxy returned {resp2.status_code} Unauthorized (Unknown Key)")
            else:
                 print(f"[-] Unexpected Status: {resp2.status_code} {resp2.text}")
        except Exception as e:
             print(f"Execution Error: {e}")
    else:
        print("Failed to get permit")

if __name__ == "__main__":
    run_verification()
