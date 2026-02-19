
# AI Guard Integration Design

## Overview
The AI Guard is a component designed to intercept LLM prompts and completions to enforce security policies, data redaction, and compliance checks. It sits between the Application and the Model Provider (e.g., OpenAI, Anthropic).

## Architecture

### 1. SDK Integration
The Python SDK (`atrosha`) will expose a `Guard` class.
Users will wrap their LLM calls with this Guard.

```python
from atrosha import Atrosha, Guard

client = Atrosha(api_key="...")
guard = Guard(client)

# Intercept
secure_prompt = guard.scan_prompt(user_prompt)
response = openai.Completion.create(prompt=secure_prompt)
validation = guard.scan_response(response)
```

### 2. Guard Logic (Cloud/Proxy)
The SDK sends the prompt to the Atrosha Proxy (Rust/Cloud).
The Proxy:
1.  Identifies PII (Personally Identifiable Information).
2.  Redacts PII based on active policies.
3.  Checks for prohibited topics.
4.  Logs the transaction (as seen in `transactions` table).

### 3. Latency & Caching
To minimize latency (<20ms added), the Guard uses:
-   **Local Caching**: SDK caches policy rules locally.
-   **Async Logging**: Transaction logs are sent asynchronously.
-   **Edge Inference**: PII detection runs on Edge nodes (or local sidecar in future).

## Future Roadmap
-   **Sidecar Mode**: Run Guard as a local Docker container for zero-latency local checking.
-   **LangChain Integration**: `AtroshaCallbackHandler` for seamless integration.
