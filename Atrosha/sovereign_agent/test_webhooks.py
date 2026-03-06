from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading
import requests
import time

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length).decode('utf-8')
        print(f"--- WEBHOOK RECEIVED ---")
        print(json.dumps(json.loads(body), indent=2))
        print("------------------------")
        self.send_response(200)
        self.end_headers()

def run_server():
    server = HTTPServer(('localhost', 8999), WebhookHandler)
    server.serve_forever()

def main():
    # Start fake webhook server
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    time.sleep(1)
    
    URL = "http://localhost:8003"
    
    # 1. Clear existing webhooks
    webhooks = requests.get(f"{URL}/webhooks").json()
    for w in webhooks:
        requests.delete(f"{URL}/webhooks/{w['id']}")
    
    # 2. Register our script as webhook
    print("Registering webhook...")
    requests.post(f"{URL}/webhooks", json={"url": "http://localhost:8999/test-hook"})
    
    # 3. Trigger ingest
    print("Triggering ingest to fire webhook...")
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), f"Invoice from WebhookTest\nTotal due: $450.00\nDate: 2026-03-05")
    pdf_bytes = doc.write()
    doc.close()
    
    files = [('file', ('test_webhook.pdf', pdf_bytes, 'application/pdf'))]
    requests.post(f"{URL}/ingest", files=files)
    
    # Wait for background task
    time.sleep(2)
    print("Done testing webhooks.")

if __name__ == "__main__":
    main()
