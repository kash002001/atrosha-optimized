import torch
import torch.nn as nn
import os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from config import ModelConfig
from model.atrosha_model import AtroshaSemanticModel

def export():
    ckpt_path = os.path.join(ROOT, "training", "checkpoints", "best_model.pt")
    onnx_path = os.path.join(ROOT, "export", "atrosha_engine.onnx")
    
    if not os.path.exists(ckpt_path):
        print(f"Error: {ckpt_path} not found")
        return

    print(f"Loading checkpoint: {ckpt_path}")
    checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    cfg = checkpoint["config"]
    
    model = AtroshaSemanticModel(cfg)
    model.load_state_dict(checkpoint["model_state"])
    model.eval()
    
    print(f"Exporting to ONNX: {onnx_path}")
    os.makedirs(os.path.dirname(onnx_path), exist_ok=True)
    
    # We use 256 as max_seq_len for inference to match the dataset and faster processing
    dummy_ids = torch.randint(0, cfg.vocab_size, (1, 256))
    dummy_mask = torch.ones(1, 256, dtype=torch.long)
    
    torch.onnx.export(
        model,
        (dummy_ids, dummy_mask),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "seq_len"},
            "attention_mask": {0: "batch_size", 1: "seq_len"},
        },
        opset_version=14
    )
    print("Export complete!")

if __name__ == "__main__":
    export()
