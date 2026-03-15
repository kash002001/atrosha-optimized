# Atrosha: Enterprise Setup Guide

This guide details the deployment of the Atrosha framework into a zero-trust production Virtual Private Cloud (VPC).

## 1. Prerequisites
- Docker & Docker Compose v2+
- Dedicated VPC Subnet with blocked external ingress.
- AWS Secrets Manager / HashiCorp Vault for credential injection.

## 2. Environment Configuration
Create a `.env` file in the root directory and inject your organization's secrets:
```env
# Proxy Security (Mandatory)
PERMIT_SECRET=crypto-secure-random-32-byte-string-here

# Integration Keys
STRIPE_API_KEY=sk_live_...
OPENAI_API_KEY=sk-proj-...

# Analytics Export (Optional)
DATADOG_API_KEY=...
```

## 3. Deployment Architecture

The entire stack is containerized for seamless Orchestration via Docker Compose or Kubernetes.

```bash
docker compose up -d
```

### Services Deployed:
- `proxy` (Port 8080): The high-speed Rust cryptographic gateway.
- `semantic-engine` (Port 8002): Local ONNX embedding cluster for intent deviation scoring.
- `intent-validator` (Port 8001): Fast validation middleware.
- `redis` & `clickhouse`: In-memory caching and immutable audit logging.

## 4. Production Hardening Checklist
- [ ] **Disable Default Ports:** Ensure ports `8123` (ClickHouse) and `6379` (Redis) are NOT exposed outside the VPC.
- [ ] **TLS Termination:** Place an AWS ALB or strict NGINX reverse-proxy in front of the Rust Proxy (`port 8080`) to handle HTTPS.
- [ ] **Agent Isolation:** Ensure your autonomous agents (Python, LangChain, crewAI) run in an isolated subnet that can ONLY egress to the internal load balancer of the Atrosha Proxy. They must have absolutely zero direct internet access.
