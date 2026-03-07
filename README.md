<div align="center">
  <h1>Project Atrosha</h1>
  <p><strong>A framework for building reliable, local financial AI agents.</strong></p>
  <p>
    <a href="https://github.com/atrosha/atrosha/actions"><img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/atrosha/atrosha/ci.yml?branch=main&style=for-the-badge" /></a>
    <a href="https://github.com/atrosha/atrosha/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" /></a>
  </p>
</div>

---

## What is this?
Project Atrosha is an open-source framework for building AI agents that handle financial tasks (like payroll checks, AP automation, or processing invoices). We built this because we wanted to use AI for internal accounting, but couldn't trust an LLM with full API access or sensitive data. 

To solve this, we split the project into three distinct parts:
1. **The Python Agent:** Handles the core AI logic, OCR, and database updates.
2. **The Rust Proxy:** Acts as a strict firewall. Before the AI makes any external API call (like a bank transfer), the proxy checks if the AI has the right permissions and budget. If the AI goes rogue, the proxy blocks it.
3. **The Next.js Dashboard:** A UI where you can approve actions, set spending limits, and see exactly what the AI is doing at all times.

## How it works
Here's the basic flow of the system:
1. You go to the Dashboard and create a "Spend Permit" for the agent (e.g., "$500 for AWS invoices").
2. The Agent runs its logic and tries to make an API call to pay the invoice.
3. The Rust Proxy intercepts the call. It checks the permit, verifies the URL is allowed, and logs the attempt to the database.
4. If everything looks good, the call goes through. If not (like if the agent tries to spend $501), it's blocked instantly.

## Getting Started

### Prerequisites
Make sure you have installed:
- Rust (1.74+) -> [rustup.rs](https://rustup.rs/)
- Python (3.10+) -> [python.org](https://www.python.org/)
- Node.js (18+)
- Redis & ClickHouse (we included a `docker-compose.yml` so you can spin these up easily)

### 1. Setup the Database
```bash
docker-compose up -d redis clickhouse
```

### 2. Start the Rust Proxy
The proxy needs to be running for the agent to do anything external.
```bash
cd proxy
cp .env.example .env  # set your keys if needed
cargo run --release
```
Runs on `localhost:8080`.

### 3. Start the Python Agent
This is the core logic engine.
```bash
cd sovereign_agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

export PROXY_URL="http://127.0.0.1:8080"
python server.py
```
Runs on `localhost:8000`.

### 4. Start the Dashboard
```bash
cd dashboard
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Contributing
If you find a bug or want to add a feature, feel free to open a PR. Just make sure to run `cargo check` in the `proxy` folder and `npm run lint` in the `dashboard` folder before committing so we keep the build clean and warning-free.

## License
MIT License. See `LICENSE` for details.
