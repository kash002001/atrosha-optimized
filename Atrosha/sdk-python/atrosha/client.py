import requests
import json
from typing import Optional, Dict, Any
from .resources.transactions import Transactions
from .resources.agents import Agents

class AtroshaSemanticError(requests.exceptions.HTTPError):
    def __init__(self, message, verdict, response=None):
        super().__init__(message, response=response)
        self.semantic_verdict = verdict
        self.is_semantic_denial = True

class Atrosha:
    def __init__(self, api_key, base_url=None):
        self.api_key = api_key
        self.base_url = base_url or 'https://proxy.atrosha.com'
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
        
        self.transactions = Transactions(self)
        self.agents = Agents(self)

    def request(self, method, path, **kwargs):
        url = f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"
        response = self.session.request(method, url, **kwargs)
        
        verdict = response.headers.get('x-atrosha-semantic-verdict')
        if not response.ok and verdict:
            raise AtroshaSemanticError(f"Atrosha Blocked by Semantic Firewall: {verdict}", verdict, response=response)
            
        response.raise_for_status()
        return response.json()
