from client import atroshaclient
import time

def run_verification():
    print("[?] Verifying SDK Agent Identity Support...\n")

    # TEST 1: Registered/Fallback Agent (agent-007)
    # This simulates a correctly onboarded agent.
    print("--- Test 1: Authenticated Agent (agent-007) ---")
    agent = atroshaclient(agent_id="agent-007")
    print(f"Identity: {agent.agent_id}")
    
    permit = agent.getpermit("authorized purchase", rail="stripe")
    if permit:
        print(f"[+] Permit Acquired")
        try:
            resp = agent.execute(permit, "refund", {"amount": 5})
            print(f"[+] Execution Status: {resp.status_code} (Expected 200)\n")
        except Exception as e:
            print(f"[-] Execution Failed: {e}\n")
    else:
        print("[-] Failed to get permit\n")

    # TEST 2: Unregistered New Agent
    # This simulates a new agent trying to use the system without registration.
    # The Proxy should BLOCK this (401 Unauthorized) because it doesn't know the key.
    print("--- Test 2: Unregistered Agent (unknown-bot-v1) ---")
    agent2 = atroshaclient(agent_id="unknown-bot-v1")
    print(f"Identity: {agent2.agent_id}")
    
    # Note: Validator might issue permit (it verifies Budget/Policy, not Keys in offline mode)
    permit2 = agent2.getpermit("unauthorized purchase", rail="stripe")
    if permit2:
        print(f"[!] Permit Acquired (Validator is permissive in demo)")
        try:
            resp2 = agent2.execute(permit2, "refund", {"amount": 5})
            if resp2.status_code == 401:
                 print(f"[+] Security Check Passed: Proxy returned {resp2.status_code} Unauthorized (Unknown Key)")
            else:
                 print(f"[-] Unexpected Status: {resp2.status_code}")
        except Exception as e:
             print(f"Execution Error: {e}")
    else:
        print("Failed to get permit")

if __name__ == "__main__":
    run_verification()
