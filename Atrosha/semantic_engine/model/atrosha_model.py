import torch
import torch.nn as nn
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import ModelConfig
from model.encoder import TransformerEncoder
from model.classifier import ClassificationHead, MLMHead


class AtroshaSemanticModel(nn.Module):
    """full model assembly: encoder + classification head"""

    def __init__(self, cfg: ModelConfig = None):
        super().__init__()
        cfg = cfg or ModelConfig()
        self.cfg = cfg

        self.encoder = TransformerEncoder(
            vocab_size=cfg.vocab_size,
            max_seq_len=cfg.max_seq_len,
            hidden_dim=cfg.hidden_dim,
            num_layers=cfg.num_layers,
            num_heads=cfg.num_heads,
            ff_dim=cfg.ff_dim,
            dropout=cfg.dropout,
            pad_token_id=cfg.pad_token_id,
        )
        self.classifier = ClassificationHead(cfg.hidden_dim, cfg.num_classes, cfg.dropout)

    def forward(self, input_ids, attention_mask=None):
        enc_out = self.encoder(input_ids, attention_mask)
        logits = self.classifier(enc_out)
        return logits

    def param_count(self):
        return sum(p.numel() for p in self.parameters())


class AtroshaPretrainModel(nn.Module):
    """encoder + MLM head for masked language modeling pre-training"""

    def __init__(self, cfg: ModelConfig = None):
        super().__init__()
        cfg = cfg or ModelConfig()
        self.cfg = cfg

        self.encoder = TransformerEncoder(
            vocab_size=cfg.vocab_size,
            max_seq_len=cfg.max_seq_len,
            hidden_dim=cfg.hidden_dim,
            num_layers=cfg.num_layers,
            num_heads=cfg.num_heads,
            ff_dim=cfg.ff_dim,
            dropout=cfg.dropout,
            pad_token_id=cfg.pad_token_id,
        )
        self.mlm_head = MLMHead(cfg.hidden_dim, cfg.vocab_size)

    def forward(self, input_ids, attention_mask=None):
        enc_out = self.encoder(input_ids, attention_mask)
        logits = self.mlm_head(enc_out)
        return logits

    def param_count(self):
        return sum(p.numel() for p in self.parameters())


if __name__ == "__main__":
    cfg = ModelConfig()
    model = AtroshaSemanticModel(cfg)
    print(f"Atrosha Semantic Engine")
    print(f"  Parameters: {model.param_count():,}")
    print(f"  Layers: {cfg.num_layers}")
    print(f"  Hidden: {cfg.hidden_dim}")
    print(f"  Heads: {cfg.num_heads}")
    print(f"  Vocab: {cfg.vocab_size}")

    # quick smoke test
    dummy_ids = torch.randint(0, cfg.vocab_size, (2, 128))
    dummy_mask = torch.ones(2, 128, dtype=torch.long)
    out = model(dummy_ids, dummy_mask)
    print(f"  Output shape: {out.shape}")  # should be (2, 3)
