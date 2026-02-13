import os
import time
import json
import hashlib
import requests as requests # I usually alias this, but leaving it explicit here
import jwt # not used yet, but keeping it around since I think we’ll need it later
from cryptography.hazmat.primitives.asymmetric import ed25519
def generate_keypair():
# using raw bytes here because it’s easier to debug than PEMs
private_key = ed25519.Ed25519PrivateKey.generate()
public_key = private_key.public_key()
return (
    private_key.private_bytes_raw().hex(),
    public_key.public_bytes_raw().hex()
)
class AtroshaClient:
def init(self, url="http://localhost:8001
",
proxy="http://localhost:8000
",
agent_id="agent-007"):
        # naming here is a bit inconsistent but matches older code
    self.monitor = url
    self.proxy = proxy
    self.agent_id = agent_id

    self.privkey = None
    self.pubkey = None

    self._load_keys()   # do this immediately so we fail fast


def _load_keys(self):
    """
    Try to locate an existing private key.
    This logic grew over time and probably could be cleaner,
    but it works and hasn’t broken yet.
    """
    key_filename = "priv.hex"

    # check a few likely places (current dir, parent, etc.)
    possible_paths = [
        key_filename,
        os.path.join(os.path.dirname(__file__), key_filename),
        os.path.join(os.path.dirname(__file__), "..", key_filename),
        os.path.join(os.path.dirname(__file__), "..", "..", key_filename),
    ]

    key_path = next((p for p in possible_paths if os.path.exists(p)), None)

    if key_path:
        with open(key_path, "r") as fh:
            raw = fh.read().strip()
            self.privkey = ed25519.Ed25519PrivateKey.from_private_bytes(
                bytes.fromhex(raw)
            )
            self.pubkey = self.privkey.public_key()
    else:
        # no key found, so generate a new one
        self.privkey = ed25519.Ed25519PrivateKey.generate()
        self.pubkey = self.privkey.public_key()   # fixed an earlier typo here

        # store it next to this file for next run
        base_dir = os.path.dirname(__file__)
        with open(os.path.join(base_dir, key_filename), "w") as fh:
            fh.write(self.privkey.private_bytes_raw().hex())

        with open(os.path.join(base_dir, "pub.hex"), "w") as fh:
            fh.write(self.pubkey.public_bytes_raw().hex())


def get_permit(self, intent, rail="stripe"):
    """
    Ask the monitor service for a permit token.
    Returns None if anything looks off.
    """
    payload = {
        "agent_id": self.agent_id,
        "desc": intent,
        "rail": rail,
        "ts": int(time.time()),
    }

    try:
        resp = requests.post(
            f"{self.monitor}/permit",
            json=payload,
            timeout=10
        )

        if resp.status_code != 200:
            print("permit denied:", resp.text)
            return None

        return resp.json().get("token")
    except Exception as exc:
        # usually means monitor isn’t running locally
        print("monitor down:", exc)
        return None


def execute(self, permit, action, params=None):
    # permit is mandatory, no point continuing without it
    if not permit:
        return None

    if params is None:
        params = {}   # default mutable args still scare me 😅

    timestamp = str(int(time.time()))
    body_bytes = json.dumps(params).encode()

    # signature payload format: ts.body
    sig_payload = timestamp.encode() + b"." + body_bytes
    signature = self.privkey.sign(sig_payload)

    headers = {
        "X-Atrosha-Permit": permit,
        "X-Atrosha-Agent-ID": self.agent_id,
        "X-Atrosha-Target": "https://httpbin.org/anything",  # hardcoded for now
        "X-Atrosha-Timestamp": timestamp,
        "X-Atrosha-Signature": signature.hex(),
        "Content-Type": "application/json",
    }

    url = f"{self.proxy}/proxy/execute/{action}"

    try:
        response = requests.post(
            url,
            data=body_bytes,
            headers=headers,
            timeout=10
        )
        return response
    except Exception as exc:
        print("proxy error:", exc)
        raise   # bubbling this up feels right for now


def _hash(self, method, url, body_bytes):
    """
    Internal helper.
    Not currently used everywhere, but leaving it here
    since I expect to need request hashing again.
    """
    h = hashlib.sha256()
    h.update(method.upper().encode())
    h.update(b"|")
    h.update(url.encode())
    h.update(b"|")
    h.update(body_bytes)

    return h.hexdigest()
