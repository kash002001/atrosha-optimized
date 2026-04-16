import os
import sys
import time
import json
import torch
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from config import ModelConfig, LABEL_TO_ID
from model.atrosha_model import AtroshaSemanticModel
from immune.red_team import FGSMAttacker
from immune.blue_team import BlueTeamUpdater
from tokenizer.train_tokenizer import load_tokenizer

def load_system():
    # Load configuration
    cfg = ModelConfig()
    cfg.hidden_dim = 512
    cfg.num_layers = 6
    cfg.num_heads = 8
    cfg.ff_dim = 2048
    cfg.max_seq_len = 512

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Initializing Immune System on {device}")
    
    # Load model from latest checkpoint
    model = AtroshaSemanticModel(cfg).to(device)
    ckpt_path = os.path.join(ROOT, "training", "checkpoints", "best_model.pt")
    if os.path.exists(ckpt_path):
        ckpt = torch.load(ckpt_path, map_location=device)
        model.load_state_dict(ckpt["model_state"])
        print(f"[+] Loaded foundational model checkpoint from epoch {ckpt.get('epoch', '?')}")
    else:
        print("[!] Warning: No checkpoint found. Starting with raw untrained model.")
        
    tokenizer = load_tokenizer()
    return model, tokenizer, device, cfg

def load_seed_attacks(attacks_path, count=1000):
    seeds = []
    if os.path.exists(attacks_path):
        with open(attacks_path, "r") as f:
            for line in f:
                data = json.loads(line)
                if data["label"] == "DENY":
                    text = json.dumps(data["payload"]["body"], separators=(",", ":"))
                    seeds.append(text)
                    if len(seeds) >= count:
                        break
    return seeds

def export_to_onnx(model, cfg, device):
    model.eval()
    onnx_path = os.path.join(ROOT, "export", "atrosha_engine.onnx")
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    dummy_ids = torch.randint(0, cfg.vocab_size, (1, 512)).to(device)
    dummy_mask = torch.ones(1, 512, dtype=torch.long).to(device)

    torch.onnx.export(
        model, (dummy_ids, dummy_mask), onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq_len"},
            "attention_mask": {0: "batch", 1: "seq_len"},
            "logits": {0: "batch"},
        },
        opset_version=17,
    )
    print(f"[+] Exported patched ONNX model to {onnx_path}")

def run_infinite_game(iterations=10):
    model, tokenizer, device, cfg = load_system()
    
    red_team = FGSMAttacker(model, tokenizer, device)
    blue_team = BlueTeamUpdater(model, tokenizer, device)
    
    attacks_path = os.path.join(ROOT, "data", "attack_corpus.jsonl")
    seeds = load_seed_attacks(attacks_path, count=5000)
    
    if not seeds:
        print("[!] No attack seeds found. Please run train_all.py Step 1 first.")
        return
        
    target_allow_id = LABEL_TO_ID["ALLOW"]
    true_deny_id = LABEL_TO_ID["DENY"]
    
    print("=" * 60)
    print("   ATROSHA PIPELINE: ADVERSARIAL IMMUNE SYSTEM (PILLAR 3)   ")
    print("=" * 60)
    
    for i in range(1, iterations + 1):
        # sample a batch of attacks
        batch_seeds = random.sample(seeds, min(32, len(seeds)))
        successful_bypasses = []
        
        print(f"\n[Generation {i}] Red Team attempting to bypass semantic firewall...")
        t0 = time.time()
        
        # Red Team Phase (Attack)
        for seed in batch_seeds:
            # perturb tokens continuously using FGSM towards ALLOW
            adv_text, success = red_team.generate_bypass(seed, target_allow_id, epsilon=0.08, max_steps=10)
            if success:
                successful_bypasses.append(adv_text)
                
        bypass_rate = len(successful_bypasses) / len(batch_seeds)
        print(f"  -> Generated {len(batch_seeds)} payloads. Bypasses found: {len(successful_bypasses)} ({bypass_rate*100:.1f}%)")
        
        # Blue Team Phase (Patch)
        if successful_bypasses:
            print(f"[Generation {i}] Blue Team synthesizing antibodies... (fine-tuning)")
            loss = blue_team.train_on_bypasses(successful_bypasses, true_deny_id, epochs=3)
            print(f"  -> Patch complete. Restorative Loss: {loss:.4f}  | Time: {time.time()-t0:.1f}s")
            
            # Export if changes were made
            export_to_onnx(model, cfg, device)
        else:
            print(f"[Generation {i}] Firewall held strong. No patching required.")

if __name__ == "__main__":
    # In production, this would run forever: run_infinite_game(iterations=100000)
    run_infinite_game(iterations=5)
