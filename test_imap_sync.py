import smtplib
import ssl
import imaplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_SERVER = "smtp.hostinger.com"
SMTP_PORT = 465
IMAP_SERVER = "imap.hostinger.com"
IMAP_PORT = 993

SENDER_EMAIL = "kash@atrosha.bond"
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD", "")

def append_to_sent_folder(msg):
    try:
        print("Connecting to IMAP...")
        imap = imaplib.IMAP4_SSL(IMAP_SERVER)
        imap.login(SENDER_EMAIL, SENDER_PASSWORD)
        print("Logged into IMAP. Appending to INBOX.Sent...")
        res = imap.append('INBOX.Sent', '', imaplib.Time2Internaldate(time.time()), msg.as_bytes())
        print(f"IMAP Append Response: {res}")
        imap.logout()
    except Exception as e:
        print(f"⚠️ IMAP Sync Error: {e}")

def main():
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = SENDER_EMAIL
    msg['Subject'] = "📊 Atrosha Sync Verification Test"
    
    body = "This is a verification email testing the IMAP Append backflow setup to ensure outgoing SMTP traffic mirrors nicely into your Hostinger Sent Mail folder GUI."
    msg.attach(MIMEText(body, 'plain'))

    context = ssl.create_default_context()

    try:
        print("Connecting to SMTP...")
        with smtplib.SMTP_SSL("smtp.hostinger.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            print("✅ SMTP Send passed.")
            append_to_sent_folder(msg)
    except Exception as e:
         print(f"💥 SMTP Error: {e}")

if __name__ == "__main__":
    main()
