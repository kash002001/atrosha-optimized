from dataclasses import dataclass, field

@dataclass
class ModelConfig:
    vocab_size: int = 16384
    max_seq_len: int = 2048
    hidden_dim: int = 512
    num_layers: int = 8
    num_heads: int = 8
    ff_dim: int = 2048       # 4x hidden_dim
    dropout: float = 0.1
    num_classes: int = 3     # ALLOW, DENY, QUARANTINE
    pad_token_id: int = 0
    cls_token_id: int = 1
    mask_token_id: int = 2

@dataclass
class TrainConfig:
    # pretrain
    pretrain_epochs: int = 10
    pretrain_lr: float = 1e-4
    pretrain_batch: int = 64
    mask_prob: float = 0.15

    # finetune
    finetune_epochs: int = 20
    finetune_lr: float = 2e-5
    finetune_batch: int = 32

    # shared
    weight_decay: float = 0.01
    warmup_steps: int = 500
    max_grad_norm: float = 1.0
    checkpoint_dir: str = "checkpoints"
    device: str = "cpu"  # override to "cuda" when GPU available

LABELS = {0: "ALLOW", 1: "DENY", 2: "QUARANTINE"}
LABEL_TO_ID = {"ALLOW": 0, "DENY": 1, "QUARANTINE": 2}
