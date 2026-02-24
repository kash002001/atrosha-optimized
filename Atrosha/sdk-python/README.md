# atrosha-sdk

Zero-trust proxy SDK for securing AI agent financial operations.

## Install

```bash
pip install atrosha-sdk
```

## Quick Start

```python
from atrosha import Atrosha

client = Atrosha(api_key="sk_live_...")

# proxy a payment
result = client.transactions.create(
    agent_id="stripe-agent",
    target_url="https://api.stripe.com/v1/charges",
    amount=5000,
    body={"currency": "usd"}
)
```

## Semantic Firewall

The SDK natively raises `AtroshaSemanticError` when the ML firewall blocks a request:

```python
from atrosha.client import AtroshaSemanticError

try:
    client.request("POST", "/proxy/v1/charges", json=payload)
except AtroshaSemanticError as e:
    print(f"Blocked: {e.semantic_verdict}")
```

## Docs

[atrosha.bond/docs](https://atrosha.bond/docs)
