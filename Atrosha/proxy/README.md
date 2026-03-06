# Atrosha Cryptographic Kernel

The Atrosha Kernel is a high-performance, security-first Rust proxy designed to act as a cryptographic firewall for AI agents. It ensures that financial transactions initiated by AI agents are immutable, authorized, and compliant with local spending policies.

## Key Features

- **Cryptographic Intent Locking:** Prevents "jailbreak" attacks by ensuring the agent's actual API call matches the user's original natural language intent.
- **Sovereign Policy Engine:** Enforces per-agent spending limits and vendor whitelists stored locally in SQLite/Redis.
- **Protocol Adapters:** Transparently handles HTTP, ACH (via bank APIs), and EVM-compatible blockchain transactions.
- **Circuit Breaker:** Automatically "kills" agents that exhibit suspicious behavior or multiple policy violations.

## Architecture

The kernel is built using a modular Rust architecture:

- `src/main.rs`: Server entry point and dependency injection.
- `src/state.rs`: Shared application state management.
- `src/handlers.rs`: Asynchronous route handling and proxy logic.
- `src/permit.rs`: Spend permit validation and intent hash computation.
- `src/semantic.rs`: Client for the Semantic Firewall (ML-based classification).

## Getting Started

### Prerequisites

- Rust (latest stable)
- Redis (standard local instance)

### Installation

```bash
cd proxy
cargo build --release
```

### Configuration

Environment variables:
- `REDIS_URL`: Connection string for policy storage.
- `PERMIT_SECRET`: Symmetric key for signing spend permits.
- `SEMANTIC_ENGINE_URL`: URL for the Atrosha ML sidecar.

## Security Model

Atrosha operates on a **Zero-Knowledge Data Plane**. No sensitive financial credentials or customer data ever pass through the Atrosha cloud—all enforcement happens within the customer's isolated network environment.
