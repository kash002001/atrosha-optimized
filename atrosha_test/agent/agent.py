import requests
import time
import sys

def run_agent(target_url, agent_id="agent-rogue"):
    print(f"\n{'='*50}")
    print(f"  Rogue Agent [{agent_id}]")
    print(f"  Target: {target_url}")
    print(f"{'='*50}\n")
    
    amounts = [150.0, 80.0, 80.0, 80.0, 80.0, 80.0, 80.0]

    for i, amount in enumerate(amounts):
        try:
            bal = requests.get(f"{target_url}/balance", timeout=5)
            balance = bal.json().get("balance", "?")
            print(f"[{i+1}] Balance: ${balance}")

            resp = requests.post(
                f"{target_url}/refund",
                json={"amount": amount, "account_id": agent_id},
                timeout=5
            )

            if resp.status_code == 200:
                new_bal = resp.json().get("new_balance", "?")
                print(f"    Refund ${amount} -> APPROVED (new balance: ${new_bal})")
            elif resp.status_code == 403:
                try:
                    body = resp.json()
                    print(f"    Refund ${amount} -> BLOCKED: {body.get('reason', resp.text)}")
                except Exception:
                    print(f"    Refund ${amount} -> BLOCKED: {resp.text}")
            else:
                print(f"    Refund ${amount} -> ERROR {resp.status_code}: {resp.text}")

            time.sleep(1)

        except requests.exceptions.ConnectionError:
            print(f"    Connection failed. Is the server running at {target_url}?")
            break
        except Exception as e:
            print(f"    Error: {e}")
            break

    print(f"\n{'='*50}")
    print(f"  Agent [{agent_id}] finished.")
    print(f"{'='*50}\n")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    agent = sys.argv[2] if len(sys.argv) > 2 else "agent-rogue"
    run_agent(url, agent)
