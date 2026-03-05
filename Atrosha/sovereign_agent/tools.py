import requests
import json

PROXY_URL = "http://localhost:8080" # Atrosha Kernel

def execute_stripe_payment(vendor: str, amount: float, session_id: str) -> dict:
    """
    Executes a payment via the Atrosha Kernel.
    The Kernel will intercept this and compare the mathematical distance
    between the payload action and the original signed intent locked in Redis.
    """
    url = f"{PROXY_URL}/proxy/charges"
    
    headers = {
        "Content-Type": "application/json",
        "X-Atrosha-Target": "https://api.stripe.com/v1",
        "X-Atrosha-Agent-ID": "agent-007",
        "X-Atrosha-Amount": str(amount),
        "X-Atrosha-Permit": "eyJhZ2VudF9pZCI6ImFnZW50LTAwNyIsImFtb3VudCI6MSwiaW50ZW50X2hhc2giOm51bGwsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzM4NDE3NTA4fQ.signature",
        "X-Atrosha-Session-ID": session_id
    }
    
    payload = {
        "vendor": vendor,
        "amount": amount,
        "currency": "USD"
    }
    
    try:
        print(f"[Kernel Bridge] Sending requested action via Atrosha Proxy...")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            return {"status": "success", "tx_ref": response.json().get("tx_ref", "tx_12345")}
        elif response.status_code == 403:
            return {"status": "blocked", "reason": "Atrosha blocked for Intent Drift"}
        else:
            return {"status": "error", "reason": response.text}
            
    except requests.exceptions.ConnectionError:
        print("Atrosha Proxy is not running. Start the Rust Proxy on port 8080.")
        return {"status": "error", "reason": "Proxy Offline"}
        
if __name__ == "__main__":
    print(execute_stripe_payment("Cloudflare", 500.0, "test_session"))
