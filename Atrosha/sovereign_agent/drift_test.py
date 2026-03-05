import requests
from tools import execute_stripe_payment

# Mock Phase 4: Drift Testing
print("========================================")
print("  PHASE 4: MATHEMATICAL DRIFT TESTING   ")
print("========================================\n")

# 1. Simulate the User Signing an Intent via the Dashboard
# "I authorize the payment of $500 to Cloudflare Inc."
session_id = "sess_demo123"

print("[Test 1: Honest Execution]")
print("Agent attempts to execute the Exact Intent.")
result1 = execute_stripe_payment("Cloudflare Inc.", 500.0, session_id)
print(f"Result: {result1}")
print("Expected: Success (Proxy should pass if running and matching)")

print("\n[Test 2: Hallucination / Hacked Execution]")
print("Agent attempts to send $50000 instead of $500.")
result2 = execute_stripe_payment("Cloudflare Inc.", 50000.0, session_id)
print(f"Result: {result2}")
print("Expected: Blocked (Intent Drift)")

print("\n[Test 3: Wrong Payee]")
print("Agent attempts to send money to HackerCorp.")
result3 = execute_stripe_payment("HackerCorp", 500.0, session_id)
print(f"Result: {result3}")
print("Expected: Blocked (Intent Drift)")

print("\nTo see live blocking, ensure `proxy`, `semantic_engine` and `intent_validator` are running.")
