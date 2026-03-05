import os
import time
import json
import uuid
import hashlib
import requests
import sys
from cryptography.hazmat.primitives.asymmetric import ed25519

class CircuitBreaker:
    def __init__(self):
        self.failures = []
        self.threshold = 3
        self.window = 60 # seconds

    def check(self):
        now = time.time()
        self.failures = [t for t in self.failures if now - t < self.window]
        if len(self.failures) >= self.threshold:
            print(f"\n[CIRCUIT BREAKER] CRITICAL: {len(self.failures)} failures in {self.window}s.")
            print("[CIRCUIT BREAKER] Terminating agent process to prevent financial loss.")
            os._exit(1)

    def record_failure(self):
        self.failures.append(time.time())
        self.check()

class atroshaclient:
    def __init__(self, url="http://localhost:8001", proxy="http://localhost:8000", agent_id="agent-007"):
        self.monitor = url.strip()
        self.proxy = proxy.strip()
        self.agent_id = agent_id
        
        self.privkey = None
        self.pubkey = None
        self.breaker = CircuitBreaker()
        self.session_id = None  # set after lock_intent()
        
        self._load_keys()

    def _load_keys(self):
        key_filename = "priv.hex"
        # check a few likely places
        possible_paths = [
            key_filename,
            os.path.join(os.path.dirname(__file__), key_filename),
            os.path.join(os.path.dirname(__file__), "..", key_filename),
        ]
        
        key_path = next((p for p in possible_paths if os.path.exists(p)), None)
        
        if key_path:
            with open(key_path, "r") as fh:
                raw = fh.read().strip()
                self.privkey = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(raw))
                self.pubkey = self.privkey.public_key()
        else:
            self.privkey = ed25519.Ed25519PrivateKey.generate()
            self.pubkey = self.privkey.public_key()
            
            base_dir = os.path.dirname(__file__)
            with open(os.path.join(base_dir, key_filename), "w") as fh:
                fh.write(self.privkey.private_bytes_raw().hex())
            with open(os.path.join(base_dir, "pub.hex"), "w") as fh:
                fh.write(self.pubkey.public_bytes_raw().hex())

    def lock_intent(self, prompt):
        """Sign and lock the user's prompt for this session.
        Must be called before dispatching the agent."""
        sid = uuid.uuid4().hex
        sig = self.privkey.sign(prompt.encode("utf-8"))
        pub_hex = self.pubkey.public_bytes_raw().hex()

        resp = requests.post(f"{self.monitor}/intent/lock", json={
            "session_id": sid,
            "prompt": prompt,
            "pub_key": pub_hex,
            "signature": sig.hex(),
        }, timeout=10)

        if resp.status_code != 200:
            print(f"[!] intent lock failed: {resp.text}")
            return None

        self.session_id = sid
        print(f"[+] intent locked: session={sid}")
        return sid

    def getpermit(self, intent, rail="stripe"):
        payload = {
            "agent_id": self.agent_id,
            "desc": intent,
            "rail": rail,
            "ts": int(time.time()),
        }
        if self.session_id:
            payload["session_id"] = self.session_id
        try:
            resp = requests.post(f"{self.monitor}/permit", json=payload, timeout=10)
            if resp.status_code != 200:
                print(f"permit denied: {resp.text}")
                return None
            return resp.json().get("token")
        except Exception as exc:
            print(f"monitor down: {exc}")
            return None

    def execute(self, permit, action, params=None):
        # Circuit Breaker Check
        self.breaker.check()

        if not permit:
            return None
        if params is None:
            params = {}

        timestamp = str(int(time.time()))
        body_bytes = json.dumps(params).encode()
        
        sig_payload = timestamp.encode() + b"." + body_bytes
        signature = self.privkey.sign(sig_payload)
        
        headers = {
            "X-Atrosha-Permit": permit,
            "X-Atrosha-Agent-ID": self.agent_id,
            "X-Atrosha-Target": "https://httpbin.org/anything",
            "X-Atrosha-Timestamp": timestamp,
            "X-Atrosha-Signature": signature.hex(),
            "Content-Type": "application/json",
        }

        # auto-attach session for intent verification
        if self.session_id:
            headers["X-Atrosha-Session-ID"] = self.session_id
        
        url = f"{self.proxy}/proxy/execute/{action}"
        
        try:
            response = requests.post(url, data=body_bytes, headers=headers, timeout=10)
            
            # Record failure if 500 or network error? 
            # Or if application error? 
            # User said: "failed transactions". 
            # We'll count 4xx (except 401 maybe) and 5xx as failures for safety.
            if response.status_code >= 400:
                print(f"[!] Transaction Failed: {response.status_code}")
                # Don't trigger breaker on 401/403 (auth/policy/budget) as those are "managed" failures?
                # User said: "attempts more than 3 failed transactions... prevent financial hallucinations".
                # A 500 or timeout is definitely a breaker event.
                # A 403 Budget Exceeded IS a failure we want to stop spamming.
                if response.status_code in [402, 403, 429, 500, 502, 503, 504]:
                     self.breaker.record_failure()
            
            return response
            
        except Exception as exc:
            print(f"proxy error: {exc}")
            self.breaker.record_failure()
            raise

    def _hash(self, method, url, body_bytes):
        h = hashlib.sha256()
        h.update(method.upper().encode())
        h.update(b"|")
        h.update(url.encode())
        h.update(b"|")
        h.update(body_bytes)
        return h.hexdigest()
