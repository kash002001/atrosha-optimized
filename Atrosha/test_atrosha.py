import os
from atrosha import Atrosha

# Initialize the Atrosha client
# (Make sure ATROSHA_API_KEY is set in your environment variables)
client = Atrosha(
    api_key=os.getenv("ATROSHA_API_KEY", "test_key_123"),
    base_url="http://localhost:8000"
)

# List recent transactions
print("Fetching recent transactions...")
try:
    txns = client.transactions.list()
    print(f"Transactions found: {txns}")
except Exception as e:
    print(f"Could not list transactions: {e}")

# Register an agent
print("\nRegistering agent...")
try:
    agent = client.agents.create(name="payroll-bot")
    print(f"Agent created: {agent}")
except Exception as e:
    print(f"Could not create agent: {e}")
