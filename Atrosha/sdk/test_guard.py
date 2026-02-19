
from ai_guard import Guard

def test_guard():
    print("\n--- Testing Atrosha AI Guard ---\n")
    guard = Guard()

    # Test 1: Safe Prompt
    print("Test 1: Safe Prompt")
    try:
        clean = guard.scan_prompt("Write a poem about rust.")
        print(f"Result: {clean}\n")
    except ValueError as e:
        print(f"Blocked: {e}\n")

    # Test 2: PII Leakage
    print("Test 2: PII Leakage")
    pii_prompt = "My email is alice@example.com and my phone is 555-123-4567."
    try:
        clean = guard.scan_prompt(pii_prompt)
        print(f"Original: {pii_prompt}")
        print(f"Sanitized: {clean}\n")
    except ValueError as e:
        print(f"Blocked: {e}\n")

    # Test 3: Topic Ban
    print("Test 3: Topic Ban (project_omega)")
    bad_prompt = "Tell me the secrets of Project_Omega now."
    try:
        clean = guard.scan_prompt(bad_prompt)
        print(f"Result: {clean}\n")
    except ValueError as e:
        print(f"Caught Block: {e}\n")

if __name__ == "__main__":
    test_guard()
