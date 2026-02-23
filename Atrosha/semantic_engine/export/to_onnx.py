import os
import sys
import torch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import ModelConfig
from model.atrosha_model import AtroshaSemanticModel


def export_to_onnx(checkpoint_path=None, out_path=None, max_len=512):
    cfg = ModelConfig()

    if checkpoint_path is None:
        checkpoint_path = os.path.join(
            os.path.dirname(__file__), "..", "training", "checkpoints", "best_model.pt"
        )
    if out_path is None:
        out_path = os.path.join(os.path.dirname(__file__), "atrosha_engine.onnx")

    print(f"[*] loading checkpoint from {checkpoint_path}")
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    model = AtroshaSemanticModel(cfg)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    # dummy inputs for tracing
    dummy_ids = torch.randint(0, cfg.vocab_size, (1, max_len))
    dummy_mask = torch.ones(1, max_len, dtype=torch.long)

    print(f"[*] exporting to ONNX: {out_path}")
    torch.onnx.export(
        model,
        (dummy_ids, dummy_mask),
        out_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "seq_len"},
            "attention_mask": {0: "batch", 1: "seq_len"},
            "logits": {0: "batch"},
        },
        opset_version=17,
    )

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[+] exported: {out_path} ({size_mb:.1f} MB)")
    return out_path


if __name__ == "__main__":
    export_to_onnx()
