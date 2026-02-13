import subprocess
import sys
import os
import time
def check_python_deps():
    # Get the directory where this script is located
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    req_path = os.path.join(base_dir, "intent_validator", "requirements.txt")
    print(f"📦 installing python dependencies from {req_path}...")
    subprocess.run([
        sys.executable, "-m", "pip", "install", "-r",
        req_path
    ], check=True)

def start_intent_validator():
    print("🚀 starting intent validator on http://localhost:8001...")
    # Change to the directory where main.py is located
    base_dir = os.path.dirname(os.path.abspath(__file__))
    validator_dir = os.path.join(base_dir, "intent_validator")
    
    os.chdir(validator_dir)
    subprocess.run([
        sys.executable, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0", "--port", "8001", "--reload"
    ])
def main():
    print(r"""
╔═══════════════════════════════════════════════════════════════╗
║              atrosha local development                     ║
╠═══════════════════════════════════════════════════════════════╣
║  prerequisites:                                             ║
║  1. start docker desktop (for redis and qdrant)               ║
║  2. run:docker run -d -p 6379:6379 redis:7-alpine            ║
║  3. run:docker run -d -p 6333:6333 qdrant/qdrant             ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    check_python_deps()
    start_intent_validator()
if __name__=="__main__":
    main()