import smtplib
import ssl
import time
import imaplib
import socket
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_SERVER = "smtp.hostinger.com"
SMTP_PORT = 465  # SSL
SENDER_EMAIL = "kash@atrosha.bond"
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "")
IMAP_SERVER = "imap.hostinger.com"

BOND_LINK = "https://atrosha.bond"


TEMPLATES = {
    "Support_Liability": {
         "subject": "⚠️ Legal Alert: Your AI Support Bot is carrying Air Canada-level liability",
         "intro": "Did you see the recent court ruling holding Air Canada liable for their FAQ Chatbot making an unauthorized $2,200 promise? If your user-facing AI isn't fully airlocked, your support grid is currently exposed to negligent misrepresentation costs.",
         "pitch": "Atrosha wraps your standard LLM pipeline with a cryptographic signature and static rule inspector framework. Chatbots cannot commit refunds, alter inventory pricing, or bypass company policy buffers without explicit verification triggers."
    },
    "Code_Leak": {
        "subject": "🚨 Security Warning: Are you guarding and sealing your source code from LLMs?",
        "intro": "Samsung's engineers historically leaked proprietary semiconductor source code directly into ChatGPT's open layout. Right now, your engineering stack is likely feeding corporate IP to public model weights with no airlock boundary to stop full static context exfiltration.",
        "pitch": "Atrosha Sovereign Agent forces dynamic inspection rules at the API level. It acts as a strict airlock for standard LLM prompt executions, catching intellectual property nodes BEFORE they cross into the public cloud execution framework."
    },
    "Fintech_Drain": {
        "subject": "💸 Risk Alert: Prompt Injection vectors capable of draining vendor balances into void nodes",
        "intro": "Traditional firewalls don't read conversational context logic. A simple prompt injection override can force autonomous FinTech or accounting LLMs to execute unauthorized refunds, wire routing triggers, or credit increases on client side.",
        "pitch": "Atrosha introduces high-integrity multi-entity airlocks for payment execution buffers. LLMs can draft intents, but Atrosha verifies the permit token before a single cent is approved or routed."
    },
    "Medical_Data": {
         "subject": "🏥 Data Breach Warning: Sensitive summaries exfiltrating onto public LLMs",
         "intro": "Running summarizer models over sensitive healthcare layouts carries massive data-exfiltration triggers. If employees use unmanaged Copilot prompts to parse nodes, that data hits external weights without audit encryption benchmarks in target scopes.",
         "pitch": "Atrosha’s framework enforces cryptographic integrity validation nodes over response blocks. No private content leaves the airlocked API boundary unauthorized."
    }
}

import re


def load_prospects():
    prospects = []

    overrides = {
        "United Airlines": "info@united.com",
        "Delta Air Lines": "info@delta.com",
        "Booking.com": "press@booking.com",
        "Shopify": "support@shopify.com",
        "Klarna": "press@klarna.com",
        "Samsung Electronics": "support@samsung.com",
        "Apple": "privacy@apple.com",
        "Amazon": "aws-security-alerts@amazon.com",
        "NVIDIA": "info@nvidia.com",
        "JPMorgan Chase": "support@jpmchase.com",
        "Stripe": "support@stripe.com",
        "Coinbase": "support@coinbase.com",
         "Pfizer": "medical.information@pfizer.com",
         "Moderna": "info@modernatx.com"
    }

    try:
        path = "prospect_leads.md"
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        current_cat = "Support_Liability"
        sections = content.split("##")

        for section in sections:
            if "Category 1" in section: current_cat = "Support_Liability"
            elif "Category 2" in section: current_cat = "Code_Leak"
            elif "Category 3" in section: current_cat = "Fintech_Drain"
            elif "Category 4" in section: current_cat = "Medical_Data"

            lines = section.split("\n")
            for line in lines:
                if line.startswith("|") and not "---" in line and not "Company" in line:
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) > 6 and parts[1].isdigit():
                        company = parts[2].replace("**", "")
                        email_strat = parts[6]


                        domain_match = re.search(r"@([\w.-]+)", email_strat)
                        if domain_match:
                            domain = domain_match.group(1)
                            contact = overrides.get(company, f"info@{domain}")
                            prospects.append({"company": company, "contact": contact, "cat": current_cat})

        print(f"📊 Dynamically loaded {len(prospects)} prospects from leadsheet.")
        return prospects
    except Exception as e:
        print(f"⚠️ Failed to parse prospect_leads.md: {e}. Falling back to hardcoded list.")
        return []

PROSPECTS = load_prospects()


import threading

def append_to_sent_folder_async(msg):
    def run_append():
        try:
            imap = imaplib.IMAP4_SSL("imap.hostinger.com", timeout=15)
            imap.login(SENDER_EMAIL, SENDER_PASSWORD)
            imap.append('INBOX.Sent', '', imaplib.Time2Internaldate(time.time()), msg.as_bytes())
            imap.logout()
        except:
            pass
    

    threading.Thread(target=run_append, daemon=True).start()

def send_outreach_email(server, prospect):
    template = TEMPLATES.get(prospect["cat"])
    if not template:
        return

    company = prospect["company"]
    to_email = prospect["contact"]

    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email
    msg['Subject'] = template["subject"]

    body = f"""Hello {company} Security & Operations Team,

{template["intro"]}

At Atrosha, we build financial security control airlocks for autonomous models. 

{template["pitch"]}

🔗 Review complete technical deployment guide, capabilities dashboard, and secure signature setups here:
👉 {BOND_LINK}

Let us lock down your API execution airlock before an LLM writes an illegal state execution trigger to your production grids.

Best regards,
Kash
Atrosha Inc.
{BOND_LINK}
"""
    msg.attach(MIMEText(body, 'plain'))

    try:
        server.send_message(msg)
        print(f"✅ Email sent successfully to {company} ({to_email})")
 
        append_to_sent_folder_async(msg)
        

        try:
            with open("sent_log.txt", "a") as f:
                f.write(to_email + "\n")
        except: pass

        return True
    except Exception as e:
        print(f"❌ Failed to send to {company}: {e}")
        return False

def main():
    print(f"Initiating Automated Outreach...")
    context = ssl.create_default_context()
    success_count = 0
    BATCH_SIZE = 25


    sent_emails: set[str] = set()
    if os.path.exists("sent_log.txt"):
        with open("sent_log.txt", "r") as f:
            sent_emails = set([line.strip() for line in f.readlines() if line.strip()])
    print(f"📋 Found {len(sent_emails)} already processed recipients. Skipping enabled.")


    for i in range(0, len(PROSPECTS), BATCH_SIZE):
        batch = PROSPECTS[i:i + BATCH_SIZE]  # type: ignore
        print(f"\n📦 Starting Batch {i//BATCH_SIZE + 1} ({len(batch)} items)...")

        try:
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context, timeout=45) as server:
                server.login(SENDER_EMAIL, SENDER_PASSWORD)
                print("🔒 Logged in successfully to Hostinger SMTP.")

                for index, prospect in enumerate(batch):
                    global_index = i + index + 1
                    
                    if prospect["contact"] in sent_emails:
                        print(f"➡️ [{global_index}/{len(PROSPECTS)}] Skipping {prospect['company']} (Already Sent)")
                        continue

                    print(f"[{global_index}/{len(PROSPECTS)}] Dispatching to {prospect['company']}...")
                    if send_outreach_email(server, prospect):
                        success_count += 1
                    time.sleep(3)

        except Exception as e:
            print(f"⚠️ Batch Error: {e}. Moving to next batch or retrying...")
            time.sleep(30)

    print(f"\n🎉 Campaign complete. Dispatched {success_count} emails successfully.")

if __name__ == "__main__":
    main()
