import os, sys, time
import random
from client import atroshaclient, generate_keypair

def run_demo():
    print("initializing test run...")
    priv = "61" * 32
    pub = "af06a3e3291714e4f356c19c9b15cd1951ec6e6662aa77be07547f289383341d"
    agent_id="agent-007"

    with open("priv.hex", "w") as f:
        f.write(priv)
    
    try:
        import redis
        r=redis.Redis(decode_responses=True)
        r.set(f"atrosha:keys:{agent_id}", pub)
        r.set(f"atrosha:limits:{agent_id}", "5000")
        print("redis keys set.")
    except:
        print("redis unavailable, proceeding (might fail)")
        
    
    client=atroshaclient(url="http://localhost:8001", proxy="http://localhost:8000")
    
    print("\n[a] testing refund...")
    try:
        res=client.getpermit("refund $25 for broken item")
        print(f"permit token: {res}")
        if res:
             result = client.execute(res, "refund", {"amount": 25})
             print(f"execution result: {result.status_code} {result.text}")
    except Exception as e:
        print(f"error: {e}")
        
    time.sleep(0.5)
    print("\n[c] high value (>10k)")
    try:
        res=client.getpermit("deposit 15k", rail="aws")
        if not res:
            print("block confirmed.")
        else:
             print("failed to block.")
    except:
        pass

if __name__=="__main__":
    run_demo()