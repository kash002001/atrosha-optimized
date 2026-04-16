import math
import torch
import torch.nn as nn

# from-scratch transformer encoder — no huggingface, no shortcuts


class MultiHeadAttention(nn.Module):
    def __init__(self, hidden_dim, num_heads, dropout=0.1):
        super().__init__()
        assert hidden_dim % num_heads == 0
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        self.scale = math.sqrt(self.head_dim)

        self.q_proj = nn.Linear(hidden_dim, hidden_dim)
        self.k_proj = nn.Linear(hidden_dim, hidden_dim)
        self.v_proj = nn.Linear(hidden_dim, hidden_dim)
        self.out_proj = nn.Linear(hidden_dim, hidden_dim)
        self.attn_drop = nn.Dropout(dropout)

    def forward(self, x, mask=None):
        B, T, C = x.shape

        q = self.q_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)

        # scaled dot-product attention
        attn = (q @ k.transpose(-2, -1)) / self.scale

        if mask is not None:
            # mask shape: (B, T) → expand to (B, 1, 1, T) for broadcasting
            attn = attn.masked_fill(mask[:, None, None, :] == 0, float("-inf"))

        attn = torch.softmax(attn, dim=-1)
        attn = self.attn_drop(attn)

        out = (attn @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.out_proj(out)


class FeedForward(nn.Module):
    def __init__(self, hidden_dim, ff_dim, dropout=0.1):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(hidden_dim, ff_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(ff_dim, hidden_dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)


class TransformerBlock(nn.Module):
    def __init__(self, hidden_dim, num_heads, ff_dim, dropout=0.1):
        super().__init__()
        self.attn = MultiHeadAttention(hidden_dim, num_heads, dropout)
        self.ffn = FeedForward(hidden_dim, ff_dim, dropout)
        self.ln1 = nn.LayerNorm(hidden_dim)
        self.ln2 = nn.LayerNorm(hidden_dim)

    def forward(self, x, mask=None):
        # pre-norm architecture (more stable training than post-norm)
        x = x + self.attn(self.ln1(x), mask)
        x = x + self.ffn(self.ln2(x))
        return x


class TransformerEncoder(nn.Module):
    def __init__(self, vocab_size, max_seq_len, hidden_dim, num_layers,
                 num_heads, ff_dim, dropout=0.1, pad_token_id=0):
        super().__init__()
        self.token_emb = nn.Embedding(vocab_size, hidden_dim, padding_idx=pad_token_id)
        self.pos_emb = nn.Embedding(max_seq_len, hidden_dim)
        self.drop = nn.Dropout(dropout)

        self.blocks = nn.ModuleList([
            TransformerBlock(hidden_dim, num_heads, ff_dim, dropout)
            for _ in range(num_layers)
        ])

        self.final_norm = nn.LayerNorm(hidden_dim)
        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, input_ids=None, attention_mask=None, inputs_embeds=None):
        if inputs_embeds is None:
            B, T = input_ids.shape
            x = self.token_emb(input_ids)
            device = input_ids.device
        else:
            B, T, _ = inputs_embeds.shape
            x = inputs_embeds
            device = inputs_embeds.device

        positions = torch.arange(T, device=device).unsqueeze(0).expand(B, T)
        x = x + self.pos_emb(positions)
        x = self.drop(x)

        for block in self.blocks:
            x = block(x, mask=attention_mask)

        return self.final_norm(x)
