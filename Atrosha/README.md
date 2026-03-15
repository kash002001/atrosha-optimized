<div align="center">
  <h1>Atrosha Enterprise Edition</h1>
  <p>
    <strong>Cryptographic Guardrails for Autonomous Enterprise AI Agents.</strong>
  </p>
  <p>
    <em>PROPRIETARY & CONFIDENTIAL</em>
  </p>
</div>

---

## 🔒 Overview

**Atrosha Enterprise** solves the single biggest roadblock preventing Fortune 500 companies from fully automating financial Operations: **LLM Hallucination Liability.**

It provides a zero-trust cryptographic proxy that sits between your autonomous AI agents and your financial APIs (Stripe, Netsuite, SAP, AWS). Atrosha mathematically guarantees that an agent can only execute transactions explicitly signed by human-verified localized *Intent*. If the LLM hallucinates or falls victim to prompt injection, the Rust proxy catches the semantic deviation and blocks the transaction at the network layer in `< 5ms`.

## 🏛 Architecture

The Atrosha Enterprise architecture completely removes API keys from your agent's localized environment. 

1. **The Isolated AI Agent**: Executes OCR, makes decisions, and generates a *Transaction Intent*. Uses an `Ed25519` private key to cryptographically sign the intent.
2. **The Rust Defense Proxy**: Intercepts the request. Verifies the cryptographic signature. Uses a local, offline LLM embedding model to compare the requested transaction against the locked Intent. 
3. **Immutable Audit Trail**: Every approved or denied request is instantly logged to ClickHouse for SOC2 compliance.

## 🚀 Quick Start (Local Trial)

For enterprise evaluators, the entire stack can be spun up locally via Docker.

**Start the Infrastructure:**
```bash
docker compose up -d redis clickhouse semantic-engine proxy intent-validator
```

**Run an Agent:**
The Python agent SDK demonstrates the cryptographic signing workflow.
```bash
pip install atrosha-sdk
python demo.py
```

## 📚 Documentation
- **[Deployment & VPC Setup](./ENTERPRISE_SETUP.md)**
- **[Security & Threat Models](./SECURITY.md)**
- **[API Reference](https://atrosha.bond/docs)**

## ⚖️ License & Agreements
This software is provided under a **Proprietary Commercial License**. Unauthorized distribution, reverse engineering, or hosting for third parties is strictly prohibited. See `LICENSE` for details.
