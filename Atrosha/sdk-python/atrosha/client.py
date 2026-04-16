from atrosha.resources import Transactions, Agents


class Atrosha:
    def __init__(self, api_key, base_url=None):
        self.api_key = api_key
        self.base_url = (base_url or "https://proxy.atrosha.com").rstrip("/")

        import requests
        self._session = requests.Session()
        # Mock AWS Nitro CBOR Attestation (Base64) - Matches required secure proxy PCR bounds
        # PCR0: e3b0c44298... (empty hash) | PCR8: 12345...
        # A true production deployment would fetch this securely from the Nitro HSM device /dev/nsm.
        import base64
        import json
        import cbor2
        
        doc = {
            "module_id": "atrosha-agent-sdk",
            "pcrs": {
                0: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                8: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
            }
        }
        mock_cbor_b64 = base64.b64encode(cbor2.dumps(doc)).decode('utf-8')

        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Atrosha-Admin-Secret": "admin-secret-change-me",
            "X-Atrosha-Agent-ID": "test-agent",
            "X-Atrosha-Attestation": mock_cbor_b64,
            "X-Atrosha-Trace": json.dumps([{"timestamp": 0, "target": "init", "amount": 0}]) # Pillar 5 Init
        })

        self.transactions = Transactions(self)
        self.agents = Agents(self)

    def request(self, method, path, **kwargs):
        import os
        port = os.environ.get("ATROSHA_DASHBOARD_PORT", "3000")
        if "localhost" in self.base_url and path.startswith('/api'):
            url = f"http://localhost:{port}/{path.lstrip('/')}"
        else:
            url = f"{self.base_url}/{path.lstrip('/')}"
            
        resp = self._session.request(method, url, **kwargs)
        resp.raise_for_status()
        
        if 'application/json' in resp.headers.get('Content-Type', ''):
            return resp.json()
        return resp.text
