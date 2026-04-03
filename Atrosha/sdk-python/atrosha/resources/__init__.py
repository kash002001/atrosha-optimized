class Transactions:
    def __init__(self, client):
        self._client = client

    def list(self):
        return self._client.request('GET', '/api/transactions')

    def guard(self, agent_id, amount, currency='usd', metadata=None, destination=None):
        payload = {
            'agent_id': agent_id,
            'amount': amount,
            'currency': currency,
            'metadata': metadata or {},
            'destination': destination
        }
        return self._client.request('POST', '/proxy/v1/guard', json=payload)

class Agents:
    def __init__(self, client):
        self._client = client

    def list(self):
        return self._client.request('GET', '/api/agents')

    def get(self, agent_id):
        return self._client.request('GET', f'/api/agents/{agent_id}')

    def create(self, name, **kwargs):
        payload = {
            'agent_id': name, 
            'pub_hex': kwargs.get('pub_hex', '0000000000000000000000000000000000000000000000000000000000000000')
        }
        return self._client.request('POST', '/admin/agents', json=payload)
