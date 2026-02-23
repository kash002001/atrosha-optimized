import torch
import torch.nn as nn


class ClassificationHead(nn.Module):
    """takes the [CLS] token embedding and outputs ALLOW/DENY/QUARANTINE"""

    def __init__(self, hidden_dim, num_classes=3, dropout=0.1):
        super().__init__()
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, encoder_output):
        # encoder_output: (B, T, hidden_dim)
        # grab the [CLS] token at position 0
        cls_emb = encoder_output[:, 0, :]
        return self.head(cls_emb)


class MLMHead(nn.Module):
    """predicts masked tokens for pre-training"""

    def __init__(self, hidden_dim, vocab_size):
        super().__init__()
        self.dense = nn.Linear(hidden_dim, hidden_dim)
        self.act = nn.GELU()
        self.norm = nn.LayerNorm(hidden_dim)
        self.decoder = nn.Linear(hidden_dim, vocab_size)

    def forward(self, encoder_output):
        # encoder_output: (B, T, hidden_dim)
        x = self.act(self.dense(encoder_output))
        x = self.norm(x)
        return self.decoder(x)  # (B, T, vocab_size)
