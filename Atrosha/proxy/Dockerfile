# Builder stage
FROM rust:slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./
COPY src ./src

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
