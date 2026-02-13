import os
import time
import json
import redis
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import jwt

app = FastAPI()

r = redis.Redis(host=os.getenv("redis_host", "localhost"), port=6379, db=0, decode_responses=True)

class permitreq(BaseModel):
    agent_id: str
    desc: str
    rail: str
    ts: int

permit_secret = "super-secret-key-change-me"

@app.post("/permit")
async def issue_permit(req: permitreq):
    if req.ts < int(time.time()) - 300:
        raise HTTPException(400, "stale req")

    try:
        budget_key = f"atrosha:budget:{req.agent_id}"
        used = float(r.get(budget_key) or 0.0)
    except:
        used = 0.0 # Hack: bypass if redis down for demo

    if used > 10000.0:
        raise HTTPException(403, "budget exceeded")

    if "gambling" in req.desc.lower():
        raise HTTPException(400, "policy violation: gambling")

    import re
    # Demo Logic: Parse "15k" strings to block high value requests at Validator level
    amount_match = re.search(r"(\d+)k", req.desc.lower())
    if amount_match and int(amount_match.group(1)) * 1000 > 10000:
        raise HTTPException(400, "policy violation: amount > 10k")
    
    payload = {
        "sub": req.agent_id,
        "intent": req.desc,
        "rail": req.rail,
        "exp": int(time.time()) + 300,
        "iat": int(time.time())
    }
    
    token = jwt.encode(payload, permit_secret, algorithm="HS256")
    
    try:
        r.publish("audit_log", json.dumps({
            "agent": req.agent_id,
            "action": req.desc,
            "status": "approved",
            "ts": int(time.time())
        }))
    except:
        pass
    
    return {"token": token, "status": "ok"}

@app.get("/health")
def health():
    return {"status": "alive", "redis": r.ping()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)