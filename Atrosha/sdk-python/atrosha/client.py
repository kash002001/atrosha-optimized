from atrosha.resources import Transactions, Agents


class Atrosha:
    def __init__(self, api_key, base_url=None):
        self.api_key = api_key
        self.base_url = (base_url or "https://proxy.atrosha.com").rstrip("/")

        import requests
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Atrosha-Admin-Secret": "admin-secret-change-me",
            "X-Atrosha-Agent-ID": "test-agent",
        })

        self.transactions = Transactions(self)
        self.agents = Agents(self)

    def request(self, method, path, **kwargs):
        # Route to Dashboard Next.js API running on port 3000
        if "localhost" in self.base_url and path.startswith('/api'):
            url = f"http://localhost:3001/{path.lstrip('/')}"
        else:
            url = f"{self.base_url}/{path.lstrip('/')}"
            
        resp = self._session.request(method, url, **kwargs)
        resp.raise_for_status()
        
        if 'application/json' in resp.headers.get('Content-Type', ''):
            return resp.json()
        return resp.text
