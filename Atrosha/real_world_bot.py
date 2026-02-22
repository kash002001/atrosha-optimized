import os
import time
import json
import requests
from cryptography.hazmat.primitives.asymmetric import ed25519

# ==========================================
# 1. ATROSHA SECURITY CONFIGURATION
# ==========================================
VALIDATOR_URL = "https://atrosha-validator.onrender.com"
PROXY_URL = "https://atrosha.onrender.com"
AGENT_ID = "demo-buyer-bot"

# Generate an Ed25519 Keypair for the Bot identity if one doesn't exist
# In production, load this from a secure secrets manager.
if not os.path.exists("bot_priv.hex"):
    privkey = ed25519.Ed25519PrivateKey.generate()
    with open("bot_priv.hex", "w") as f: f.write(privkey.private_bytes_raw().hex())
    with open("bot_pub.hex", "w") as f: f.write(privkey.public_key().public_bytes_raw().hex())

with open("bot_priv.hex", "r") as f:
    BOT_PRIV_KEY = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(f.read().strip()))

def secure_request(target_url, method="POST", payload=None, intent_description=""):
    """
    This function wraps all outbound API calls made by the AI.
    Instead of hitting `target_url` directly, it routes exactly through the Atrosha Proxy.
    """
    print(f"\n[Shield] 🤖 AI attempting to interact with: {target_url}")
    print(f"[Shield] 📝 Stated Intent: {intent_description}")
    
    # 1. ATROSHA PHASE 1: GET PERMIT FROM POLICY VALIDATOR
    res = requests.post(f"{VALIDATOR_URL}/permit", json={
        "agent_id": AGENT_ID,
        "desc": intent_description,
        "rail": "api",
        "ts": int(time.time())
    })
    if res.status_code != 200:
        return f"BLOCK: Policy Engine rejected your intent. {res.text}"
    permit_jwt = res.json()["token"]
    print("[Shield] 🟢 Intent Approved by AI Policy Engine! Spending Permit acquired.")

    # 2. ATROSHA PHASE 2: SIGN PAYLOAD AND HIT THE PROXY
    timestamp = str(int(time.time()))
    body_bytes = json.dumps(payload).encode() if payload else b"{}"
    
    # Signature Payload: timestamp + "." + body
    sig_payload = timestamp.encode() + b"." + body_bytes
    signature = BOT_PRIV_KEY.sign(sig_payload).hex()

    headers = {
        "X-Atrosha-Agent-ID": AGENT_ID,
        "X-Atrosha-Target": target_url,
        "X-Atrosha-Permit": permit_jwt,
        "X-Atrosha-Timestamp": timestamp,
        "X-Atrosha-Signature": signature,
        "Content-Type": "application/json"
    }

    print("[Shield] 🔒 Routing signed request through Secure Proxy...\n")
    proxy_response = requests.request(
        method=method, 
        url=f"{PROXY_URL}/proxy/forward", # Note: the proxy captures all routes under /proxy/*
        headers=headers, 
        data=body_bytes,
        timeout=10
    )
    
    return proxy_response


# ==========================================
# 2. THE AI AGENT LAYER (E.g., Langchain / OpenAI)
# ==========================================

def ai_tool_buy_cloud_server(server_size: str, cost: int):
    """
    This is the Tool function exposed to your LLM.
    When the AI decides to buy a server, it calls this function.
    """
    print(f"🤖 [AI THOUGHT]: I have decided to purchase a {server_size} server for ${cost}.")
    
    intent = f"Purchase a {server_size} cloud server for {cost} USD to host the user's website."
    api_endpoint = "https://jsonplaceholder.typicode.com/posts" # Mock Cloud Provider API
    
    # The Tool uses Atrosha's secure routing instead of direct requests!
    response = secure_request(
        target_url=api_endpoint,
        method="POST",
        payload={"server": server_size, "cost": cost},
        intent_description=intent
    )
    
    if hasattr(response, 'status_code'):
        if response.status_code in [200, 201]:
             return f"SUCCESS! Server bought. Provider response: {response.text}"
        else:
             return f"FAILED! Proxy blocked or API error: {response.status_code} {response.text}"
    else:
        return str(response)

# ==========================================
# 3. RUN THE SIMULATION
# ==========================================
if __name__ == "__main__":
    print("=============================================")
    print("   ATROSHA BOT INTEGRATION DEMO")
    print("=============================================\n")
    
    # Make sure to register the bot's public key first!
    with open("bot_pub.hex", "r") as f: pub = f.read().strip()
    print(f"⚠️ IMPORTANT: Before running this tool, you must register this Bot's Public Key with Atrosha:")
    print(f"Agent ID: {AGENT_ID}")
    print(f"Public Key: {pub}")
    print("\nRun this command in another terminal to register it:")
    print(f'curl -X POST -H "X-Atrosha-Admin-Secret: admin-secret-change-me" -H "Content-Type: application/json" -d "{{\\"agent_id\\": \\"{AGENT_ID}\\", \\"pub_hex\\": \\"{pub}\\", \\"role\\": \\"autonomous\\"}}" {PROXY_URL}/admin/agents\n')
    
    input("Press Enter once you have registered the key to let the AI run its tool...")
    
    # Simulate the LLM calling the tool
    result = ai_tool_buy_cloud_server("t3.medium", 45)
    
    print("\n[AI TOOL RESULT]:")
    print(result)
