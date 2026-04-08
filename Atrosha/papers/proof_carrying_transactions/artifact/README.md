# Artifact Appendix: Proof-Carrying Transactions

This artifact contains the benchmarking suite necessary to reproduce the evaluation results presented in Section 7, specifically Table II (Latency), Table III (End-to-End), and Figure 2 (R1CS Constraints) of the paper.

## Hardware Requirements
- **CPU**: AMD EPYC 7B13 or equivalent (4+ cores recommended)
- **RAM**: 8GB+
- **OS**: Linux / Docker 

## Instructions

1. **Build the Docker Image**
   From the repository root (parent of the `proxy` folder):
   ```bash
   docker build -t pct-artifact -f papers/proof_carrying_transactions/artifact/Dockerfile .
   ```

2. **Run the Benchmark Container**
   ```bash
   docker run -it pct-artifact /bin/bash
   ```

3. **Execute the Benchmarks**
   Inside the container shell, run the Criterion benchmark suite:
   ```bash
   cargo bench
   ```

4. **Execute Constraint Counter**
   To observe the generated constraints for the baseline semantic policies simulated in the R1CS compiler:
   ```bash
   cargo run --bin constraint_counter
   ```

## Interpreting Results
The `cargo bench` output will display proving and verification latencies grouped by AST evaluation complexity tiers (Tier 1 through Tier 5). The output directly maps to the reported 95ms proving and 4.2ms verification latency distributions defined in the paper.
