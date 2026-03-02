# atrosha — Python SDK

Official Python SDK for the [Atrosha](https://atrosha.bond) AI Agent Safety Proxy.

## Install

```bash
pip install atrosha
```

## Quick Start

### Sync

```python
from atrosha import AtroshClient, ClassifyRequest

client = AtroshClient(api_key="your-api-key")

verdict = client.classify(ClassifyRequest(
    target_url="api.stripe.com/v1/charges",
    payload={
        "intent": "process payment",
        "amount": 5000,
        "currency": "USD",
        "destination": "supplier@acme.com",
    }
))

if verdict.verdict == "DENY":
    raise PermissionError(f"Atrosha blocked: {verdict.reason}")
```

### Async

```python
import asyncio
from atrosha import AtroshClient, ClassifyRequest

async def main():
    async with AtroshClient(api_key="your-api-key") as client:
        verdict = await client.aclassify(ClassifyRequest(
            target_url="api.openai.com/v1/chat",
            payload={"messages": [{"role": "user", "content": "Hello!"}]}
        ))
        print(verdict.verdict, verdict.confidence)

asyncio.run(main())
```

## API

### `AtroshClient(api_key, base_url?, max_retries?, timeout?)`

| Param | Default | Description |
|---|---|---|
| `api_key` | required | Your Atrosha API key |
| `base_url` | prod URL | Override for local/staging |
| `max_retries` | `3` | On transient network errors |
| `timeout` | `10.0` | Seconds per request |

### `classify(req) → ClassifyResponse`
### `aclassify(req) → ClassifyResponse` _(async)_

```python
@dataclass
class ClassifyResponse:
    verdict: str      # "ALLOW" | "DENY"
    confidence: float
    latency_ms: float
    source: str       # "heuristic" | "semantic_v3"
    reason: str
```

## Error Handling

Raises `httpx.HTTPStatusError` on 4xx/5xx, `httpx.TransportError` / `httpx.TimeoutException` on network failures — both after `max_retries` with exponential backoff.
