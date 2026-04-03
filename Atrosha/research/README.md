# Atrosha Research

This directory contains the academic research papers underpinning Atrosha's five core pillars.
Each paper targets a top-tier venue in security, AI safety, or formal methods.

## Papers

| Paper | Target Venue | Pillar |
|-------|-------------|--------|
| `papers/01_proof_carrying_transactions/` | IEEE S&P / USENIX Security | zkSNARK policy compliance |
| `papers/02_causal_intent_verification/` | NeurIPS / ICML | Causal reasoning for agent safety |
| `papers/03_adversarial_immune_system/` | ACM CCS / USENIX Security | Self-evolving defense network |
| `papers/04_hardware_rooted_identity/` | NDSS / IEEE S&P | TEE attestation for agents |
| `papers/05_temporal_logic_verification/` | CAV / TACAS | LTL model checking for policies |

## Building

Each paper directory contains a `main.tex`. Build with:

```bash
cd papers/01_proof_carrying_transactions
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

## Models

The `models/` directory contains training scripts and configs for fine-tuned models used in the research (e.g., causal NLI model for Pillar 2).
