# @atrosha/client — Node.js SDK

Official TypeScript SDK for the [Atrosha](https://atrosha.bond) AI Agent Safety Proxy.

## Install

```bash
npm install @atrosha/client
# or
pnpm add @atrosha/client
```

## Quick Start

```typescript
import { AtroshClient } from "@atrosha/client";

const atrosha = new AtroshClient({
  apiKey: "your-api-key",
  // baseUrl: "https://atrosha-engine.onrender.com" // optional, defaults to prod
});

const verdict = await atrosha.classify({
  target_url: "api.stripe.com/v1/charges",
  payload: {
    intent: "process payment",
    amount: 5000,
    currency: "USD",
    destination: "supplier@acme.com",
  },
});

if (verdict.verdict === "DENY") {
  throw new Error(`Atrosha blocked this request: ${verdict.reason}`);
}
// proceed with actual API call
```

## API

### `new AtroshClient(opts)`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | required | Your Atrosha API key |
| `baseUrl` | `string` | production URL | Override for self-hosted/staging |
| `maxRetries` | `number` | `3` | Retry attempts on transient errors |
| `timeoutMs` | `number` | `10000` | Per-request timeout |

### `classify(req): Promise<ClassifyResponse>`

Sends a payload to the Semantic Engine for classification.

```typescript
interface ClassifyRequest {
  target_url: string;
  payload: Record<string, unknown>;
}

interface ClassifyResponse {
  verdict: "ALLOW" | "DENY";
  confidence: number;    // 0.0–1.0
  latency_ms: number;
  source: string;        // "heuristic" | "semantic_v3"
  reason: string;
}
```

### `health(): Promise<HealthResponse>`

Checks engine liveness, model status, and audit sink.

## Error Handling

The SDK throws on HTTP errors and network failures. After `maxRetries` attempts with exponential backoff (200ms, 400ms, 800ms), the original error is re-thrown.

```typescript
try {
  const res = await atrosha.classify({ target_url, payload });
} catch (err) {
  // Network failure or Atrosha 5xx
  console.error("Atrosha unreachable — fail open or abort");
}
```

## Build

```bash
npm run build   # outputs ESM + CJS + .d.ts to dist/
```
