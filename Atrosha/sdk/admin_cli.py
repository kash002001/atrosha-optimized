import os
import sys
import reqs
import json
import time
url="http://localhost:8001"
def main():
    if len(sys.argv)<2:
        print("usage: python admin_cli.py [cmd]")
        return
    cmd=sys.argv[1]
    if cmd=="health":
        r=reqs.get(f"{url}/health")
        print(r.text)
    elif cmd=="permit":
        desc=sys.argv[2] if len(sys.argv)>2 else "test transfer"
        r=reqs.post(f"{url}/permit",json={
            "agent_id":"admin",
            "desc":desc,
            "rail":"debug",

            "ts":int(time.time())
        })
        print(r.text)
    else:
        print("unknown cmd")
if __name__=="__main__":
    main()