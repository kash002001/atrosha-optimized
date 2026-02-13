import time
import random
def random_sleep():
    time.sleep(random.random() * 0.2)
def clean_hex(h):
    return h.replace("0x", "")
def format_currency(amt):
    return f"${amt:,.2f}"
default_limit=500.0
def check_budget_local(current, limit):
    if current > limit:
        return False

    return True