import json
import os
from collections import Counter
from urllib.parse import urlparse

def analyze_jsonl(path, name, out_file):
    out_file.write(f"\n" + "="*50 + "\n")
    out_file.write(f"ANALYZING: {name}\n")
    out_file.write("="*50 + "\n")
    if not os.path.exists(path):
        out_file.write(f"Error: {path} not found.\n")
        return

    total_count = 0
    labels = Counter()
    methods = Counter()
    domains = Counter()
    header_keys = Counter()
    body_keys = Counter()
    payload_lengths = []

    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            total_count += 1
            try:
                data = json.loads(line)
            except Exception:
                continue

            labels[data.get('label', 'UNKNOWN')] += 1
            
            payload = data.get('payload', {})
            methods[payload.get('method', 'UNKNOWN')] += 1
            
            url = payload.get('target_url', '')
            if url:
                parsed = urlparse(url)
                domains[parsed.netloc] += 1
            
            headers = payload.get('headers', {})
            header_keys.update(headers.keys())
            
            body = payload.get('body', {})
            if isinstance(body, dict):
                body_keys.update(body.keys())
            
            # length analysis
            payload_str = json.dumps(payload, separators=(',', ':'))
            payload_lengths.append(len(payload_str))

    out_file.write(f"Total Samples: {total_count}\n")
    
    out_file.write("\n[Labels]\n")
    for k, v in labels.items():
        out_file.write(f"  {k:15}: {v}\n")
        
    out_file.write("\n[Methods]\n")
    for k, v in methods.items():
        out_file.write(f"  {k:15}: {v}\n")
        
    out_file.write("\n[Top Domains]\n")
    for k, v in domains.most_common(10):
        out_file.write(f"  {k:30}: {v}\n")
        
    out_file.write("\n[Top Headers]\n")
    for k, v in header_keys.most_common(5):
        out_file.write(f"  {k:30}: {v}\n")

    out_file.write("\n[Top Body Keys]\n")
    for k, v in body_keys.most_common(5):
        out_file.write(f"  {k:30}: {v}\n")

    if payload_lengths:
        avg_len = sum(payload_lengths)/len(payload_lengths)
        out_file.write(f"\n[Payload Statistics]\n")
        out_file.write(f"  Avg Length: {avg_len:.2f}\n")
        out_file.write(f"  Max Length: {max(payload_lengths)}\n")
        out_file.write(f"  Min Length: {min(payload_lengths)}\n")
    out_file.write("="*50 + "\n")


if __name__ == "__main__":
    data_dir = os.path.dirname(__file__)
    results_path = os.path.join(data_dir, "analysis_results.txt")
    with open(results_path, 'w', encoding='utf-8') as out_f:
        analyze_jsonl(os.path.join(data_dir, "benign_corpus.jsonl"), "Benign Corpus", out_f)
        analyze_jsonl(os.path.join(data_dir, "attack_corpus.jsonl"), "Attack Corpus", out_f)
    print(f"Analysis complete. Results written to {results_path}")

