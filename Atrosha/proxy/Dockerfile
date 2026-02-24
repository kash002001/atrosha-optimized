# Builder stage
FROM rust:slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml Cargo.lock* ./
# Create dummy src to build dependencies
RUN mkdir src && echo "fn main() {println!(\"dummy\")}" > src/main.rs
RUN cargo build --release

# Build actual source
COPY src ./src
# Touch main.rs to force rebuild
RUN touch src/main.rs
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Create non-root user
RUN groupadd -r atrosha && useradd -r -g atrosha atrosha

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/atrosha-proxy .

RUN chown atrosha:atrosha /app/atrosha-proxy
USER atrosha

ENV PORT=10000
EXPOSE $PORT

CMD ["./atrosha-proxy"]
