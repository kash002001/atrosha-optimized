import os
import time
import json
import uuid
import redis
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import jwt
from cryptography.hazmat.primitives.asymmetric import ed25519

app = FastAPI()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
r = redis.from_url(redis_url, decode_responses=True)

permit_secret = os.getenv("PERMIT_SECRET", "super-secret-key-change-me")
INTENT_TTL = int(os.getenv("INTENT_TTL", 3600))  # 1 hour default


# ── models ──────────────────────────────────────────────

class IntentLockReq(BaseModel):
    session_id: str
    prompt: str
    pub_key: str       # hex-encoded ed25519 public key
    signature: str     # hex-encoded ed25519 signature of prompt bytes

class permitreq(BaseModel):
    agent_id: str
    desc: str
    rail: str
    ts: int
    session_id: Optional[str] = None  # links permit to a locked intent


# ── /intent/lock ────────────────────────────────────────

@app.post("/intent/lock")
async def lock_intent(req: IntentLockReq):
    """Lock a user's signed natural language prompt for a session.
    
    The client signs the raw prompt bytes with Ed25519.
    We verify the signature, then store the prompt in Redis
    keyed by session_id with a TTL so it auto-expires.
    """
    # verify the ed25519 signature
    try:
        pub_bytes = bytes.fromhex(req.pub_key)
        sig_bytes = bytes.fromhex(req.signature)
        pubkey = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        pubkey.verify(sig_bytes, req.prompt.encode("utf-8"))
    except Exception as e:
        raise HTTPException(403, f"signature verification failed: {e}")

    # store in redis
    key = f"atrosha:intent:{req.session_id}"
    payload = json.dumps({
        "prompt": req.prompt,
        "pub_key": req.pub_key,
        "locked_at": int(time.time()),
    })

    try:
        r.setex(key, INTENT_TTL, payload)
    except Exception as e:
        raise HTTPException(500, f"redis error: {e}")

    print(f"[INTENT LOCK] session={req.session_id} prompt={req.prompt[:60]}...")
    return {"session_id": req.session_id, "status": "locked", "ttl": INTENT_TTL}


# ── /intent/{session_id} (read back) ───────────────────

@app.get("/intent/{session_id}")
async def get_intent(session_id: str):
    """Fetch the locked intent for a session (used by the proxy)."""
    key = f"atrosha:intent:{session_id}"
    try:
        raw = r.get(key)
    except Exception:
        raise HTTPException(503, "redis unavailable")

    if not raw:
        raise HTTPException(404, "no locked intent for this session")

    data = json.loads(raw)
    return {"session_id": session_id, "prompt": data["prompt"], "locked_at": data["locked_at"]}


# ── /permit (updated to embed session_id) ──────────────

@app.post("/permit")
async def issue_permit(req: permitreq):
    if req.ts < int(time.time()) - 300:
        raise HTTPException(400, "stale req")

    try:
        budget_key = f"atrosha:budget:{req.agent_id}"
        used = float(r.get(budget_key) or 0.0)
    except Exception:
        used = 0.0

    if used > 10000.0:
        raise HTTPException(403, "budget exceeded")

    if "gambling" in req.desc.lower():
        raise HTTPException(400, "policy violation: gambling")

    import re
    amount_match = re.search(r"(\d+)k", req.desc.lower())
    if amount_match and int(amount_match.group(1)) * 1000 > 10000:
        raise HTTPException(400, "policy violation: amount > 10k")

    payload = {
        "sub": req.agent_id,
        "intent": req.desc,
        "rail": req.rail,
        "exp": int(time.time()) + 300,
        "iat": int(time.time()),
    }

    # embed session_id if the agent provided one — links this permit to a locked intent
    if req.session_id:
        payload["session_id"] = req.session_id

    token = jwt.encode(payload, permit_secret, algorithm="HS256")

    try:
        r.publish("audit_log", json.dumps({
            "agent": req.agent_id,
            "action": req.desc,
            "status": "approved",
            "session_id": req.session_id,
            "ts": int(time.time())
        }))
    except Exception:
        pass

    return {"token": token, "status": "ok"}


@app.get("/health")
def health():
    try:
        ping = r.ping()
    except Exception:
        ping = False
    return {"status": "alive", "redis": ping}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)