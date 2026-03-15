# Atrosha: Enterprise Security Architecture

Atrosha provides zero-trust cryptographic guardrails for autonomous AI agents. This document outlines the security posture, threat models, and architectural guarantees provided by the Atrosha proxy.

## 1. Threat Model Mitigation
Enterprise AI agents face unique threats. Atrosha mitigates the following core vulnerabilities:
- **Prompt Injection & Hallucination Hijacking:** The proxy mathmatically blocks agents that attempt to execute transactions outside of the cryptographically signed user intent. If an LLM is hijacked to wire funds to an attacker, the structural semantic deviation triggers an immediate `403 Forbidden`.
- **Exfiltration of API Keys:** The agent never holds the production Stripe, Banking, or Vendor API keys. The agent only holds an `Ed25519` private key used to sign its intents. The Atrosha proxy holds the vendor keys in its secured vault and attaches them only *after* the payload signature and intent are verified.
- **Man-in-the-Middle (MITM) Attacks:** All communication between the agent and the proxy is protected by TLS 1.3. Furthermore, the payload itself is cryptographically signed, preventing tampering even if TLS is compromised.

## 2. Cryptographic Workflow
1. **Agent Provisioning:** An `Ed25519` keypair is generated. The Public Key is registered with the Atrosha Proxy.
2. **Intent Signing:** The agent SDK hashes the localized payload and signs it using the Private Key.
3. **Rust Proxy Verification:** The high-speed Rust proxy intercepts the request, verifies the signature against the cached Public Key, and evaluates the intent deviation.
4. **Upstream Forwarding:** Only upon strict verification does the proxy attach the upstream vendor credentials and finalize the transaction.

## 3. Deployment Security & VPC Isolation
We recommend deploying the Atrosha Proxy within an isolated Virtual Private Cloud (VPC) subnet. 
- Restrict inbound traffic to the Proxy exclusively from the subnets hosting your sovereign agents.
- The Proxy should be the **only** egress point allowed to reach external financial APIs (e.g., `api.stripe.com`).
- Store the `$ATROSHA_ADMIN_SECRET` and upstream vendor keys in a hardened secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault) and inject them at runtime via environment variables.

## 4. Audit & Compliance
Every transaction, approved or denied, generates a cryptographic audit receipt stored in the local SQLite/Postgres datastore. These logs satisfy SOC2 and ISO27001 requirements for non-repudiation of autonomous financial events.
