import json
import random
import uuid
import hashlib
import os

# generates realistic benign financial API traffic for pre-training and fine-tuning

_CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "jpy", "inr"]
_METHODS = ["POST", "GET", "PUT", "PATCH", "DELETE"]

_STRIPE_ENDPOINTS = [
    "/v1/charges", "/v1/refunds", "/v1/customers", "/v1/payment_intents",
    "/v1/subscriptions", "/v1/invoices", "/v1/payouts", "/v1/transfers",
    "/v1/balance", "/v1/products", "/v1/prices", "/v1/checkout/sessions",
]

_WISE_ENDPOINTS = [
    "/v1/transfers", "/v1/quotes", "/v1/accounts", "/v1/profiles",
    "/v1/recipient-accounts", "/v1/borderless-accounts",
]

_PAYPAL_ENDPOINTS = [
    "/v2/checkout/orders", "/v2/payments/captures", "/v1/payments/payouts",
    "/v1/billing/subscriptions", "/v1/invoicing/invoices",
]

_AWS_COST_ENDPOINTS = [
    "/ce/GetCostAndUsage", "/ce/GetCostForecast",
    "/budgets/CreateBudget", "/budgets/DescribeBudgets",
]

_DESCRIPTIONS = [
    "Monthly SaaS subscription payment",
    "Customer refund for order",
    "Freelancer payout",
    "Vendor invoice settlement",
    "Cloud infrastructure billing",
    "Office supplies purchase",
    "Software license renewal",
    "Employee reimbursement",
    "Marketing campaign spend",
    "Server hosting fee",
    "Domain renewal",
    "Annual maintenance contract",
    "Consulting fee payment",
    "Travel booking reimbursement",
    "Equipment procurement",
]

_AGENT_NAMES = [
    "billing_bot", "refund_agent", "payroll_processor", "procurement_ai",
    "expense_tracker", "invoice_bot", "subscription_mgr", "cost_optimizer",
    "payment_router", "treasury_agent",
]


def _rand_amount(low=100, high=50000):
    return random.randint(low, high)

def _rand_agent_id():
    return f"agt_{uuid.uuid4().hex[:12]}"

def _rand_sig():
    return hashlib.sha256(uuid.uuid4().bytes).hexdigest()[:64]


def gen_stripe_charge():
    return {
        "method": "POST",
        "target_url": f"https://api.stripe.com{random.choice(_STRIPE_ENDPOINTS)}",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
        },
        "body": {
            "amount": _rand_amount(),
            "currency": random.choice(_CURRENCIES),
            "description": random.choice(_DESCRIPTIONS),
            "customer": f"cus_{uuid.uuid4().hex[:14]}",
            "metadata": {"order_id": f"ord_{random.randint(1000, 999999)}"},
        },
    }

def gen_stripe_refund():
    return {
        "method": "POST",
        "target_url": "https://api.stripe.com/v1/refunds",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
        },
        "body": {
            "charge": f"ch_{uuid.uuid4().hex[:24]}",
            "amount": _rand_amount(50, 10000),
            "reason": random.choice(["duplicate", "requested_by_customer", "fraudulent"]),
        },
    }

def gen_wise_transfer():
    return {
        "method": "POST",
        "target_url": f"https://api.wise.com{random.choice(_WISE_ENDPOINTS)}",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
        },
        "body": {
            "targetAccount": random.randint(10000000, 99999999),
            "quoteId": f"q_{uuid.uuid4().hex[:16]}",
            "customerTransactionId": str(uuid.uuid4()),
            "details": {
                "reference": random.choice(_DESCRIPTIONS),
                "transferPurpose": "verification.transfers.purpose.pay.bills",
            },
        },
    }

def gen_paypal_payout():
    return {
        "method": "POST",
        "target_url": f"https://api.paypal.com{random.choice(_PAYPAL_ENDPOINTS)}",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
        },
        "body": {
            "sender_batch_header": {
                "sender_batch_id": f"batch_{random.randint(1000, 99999)}",
                "email_subject": "You have a payout!",
            },
            "items": [
                {
                    "recipient_type": "EMAIL",
                    "amount": {"value": f"{_rand_amount(100, 5000) / 100:.2f}", "currency": "USD"},
                    "receiver": f"vendor{random.randint(1, 500)}@example.com",
                    "note": random.choice(_DESCRIPTIONS),
                }
            ],
        },
    }

def gen_aws_cost_query():
    return {
        "method": "POST",
        "target_url": f"https://ce.us-east-1.amazonaws.com{random.choice(_AWS_COST_ENDPOINTS)}",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
        },
        "body": {
            "TimePeriod": {"Start": "2026-01-01", "End": "2026-01-31"},
            "Granularity": random.choice(["DAILY", "MONTHLY"]),
            "Metrics": ["BlendedCost", "UnblendedCost", "UsageQuantity"],
        },
    }


def gen_openai_chat():
    return {
        "method": "POST",
        "target_url": "https://api.openai.com/v1/chat/completions",
        "headers": {
            "X-Atrosha-Agent-ID": _rand_agent_id(),
            "X-Atrosha-Signature": _rand_sig(),
            "Content-Type": "application/json",
            "Authorization": "Bearer sk-1234",
        },
        "body": {
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": random.choice([
                    "What is the capital of France?",
                    "Write a python script to reverse a string.",
                    "Summarize the following meeting notes.",
                    "How do I configure a redis server?",
                    "Translate 'Hello world' to Spanish.",
                ])}
            ],
            "temperature": 0.7,
        },
    }

_GENERATORS = [
    gen_stripe_charge,
    gen_stripe_refund,
    gen_wise_transfer,
    gen_paypal_payout,
    gen_aws_cost_query,
    gen_openai_chat,
]


def generate_benign_dataset(n=100000, out_path=None):
    if out_path is None:
        out_path = os.path.join(os.path.dirname(__file__), "benign_corpus.jsonl")

    samples = []
    for _ in range(n):
        gen = random.choice(_GENERATORS)
        payload = gen()
        samples.append({"payload": payload, "label": "ALLOW"})

    with open(out_path, "w") as f:
        for s in samples:
            f.write(json.dumps(s) + "\n")

    print(f"[+] wrote {n} benign samples to {out_path}")
    return out_path


if __name__ == "__main__":
    generate_benign_dataset()
