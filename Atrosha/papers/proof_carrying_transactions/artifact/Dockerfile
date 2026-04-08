# Proof-Carrying Transactions Benchmark Artifact
# Designed for conference artifact evaluation

FROM rust:1.75-bookworm

WORKDIR /usr/src/pct-artifact

# Copy required dependencies
COPY ./proxy ./proxy

WORKDIR /usr/src/pct-artifact/proxy

# Pre-fetch crates
RUN cargo fetch

# Build the criterion benchmarks
RUN cargo build --benches --release

CMD ["echo", "Run 'cargo bench' to execute the Proof-Carrying Transactions benchmark suite."]
