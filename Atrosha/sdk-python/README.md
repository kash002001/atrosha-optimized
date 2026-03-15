# atrosha-sdk

Official Python SDK for the [Atrosha](https://atrosha.bond) cryptographic AI proxy.

## Installation

```bash
pip install atrosha-sdk
```

## Usage

```python
import os
from atrosha import Atrosha

client = Atrosha(api_key=os.getenv("ATROSHA_API_KEY"))

# list recent transactions
txns = client.transactions.guard(
    agent_id="my-agent",
    amount=5000,
    currency="usd",
)

# list all agents
agents = client.agents.list()
```

## Links

- [Documentation](https://atrosha.bond/docs)
- [GitHub](https://github.com/kash002001/atrosha)
- [Issues](https://github.com/kash002001/atrosha/issues)

## License

MIT
