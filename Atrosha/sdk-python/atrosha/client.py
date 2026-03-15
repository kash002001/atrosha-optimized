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
        })

        self.transactions = Transactions(self)
        self.agents = Agents(self)

    def request(self, method, path, **kwargs):
        url = f"{self.base_url}/{path.lstrip('/')}"
        resp = self._session.request(method, url, **kwargs)
        resp.raise_for_status()
        return resp.json()
