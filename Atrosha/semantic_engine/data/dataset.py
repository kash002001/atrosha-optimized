import json
import os
import random
import torch
from torch.utils.data import Dataset, DataLoader

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import ModelConfig, LABEL_TO_ID
from tokenizer.train_tokenizer import load_tokenizer


class PayloadDataset(Dataset):
    """pytorch dataset that tokenizes raw API payloads for the semantic engine"""

    def __init__(self, jsonl_paths: list[str], max_len=None, tokenizer=None):
        cfg = ModelConfig()
        self.max_len = max_len or cfg.max_seq_len
        self.pad_id = cfg.pad_token_id
        self.tok = tokenizer or load_tokenizer()
        self.samples = []

        for path in jsonl_paths:
            if not os.path.exists(path):
                continue
            with open(path) as f:
                for line in f:
                    try:
                        obj = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue
                    payload_text = json.dumps(obj.get("payload", obj), separators=(",", ":"))
                    label_str = obj.get("label", "ALLOW")
                    label_id = LABEL_TO_ID.get(label_str, 0)
                    self.samples.append((payload_text, label_id))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        text, label = self.samples[idx]
        encoded = self.tok.encode(text)
        ids = encoded.ids[:self.max_len]

        # pad
        pad_len = self.max_len - len(ids)
        input_ids = ids + [self.pad_id] * pad_len
        attn_mask = [1] * len(ids) + [0] * pad_len

        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attn_mask, dtype=torch.long),
            "label": torch.tensor(label, dtype=torch.long),
        }


class PretrainDataset(Dataset):
    """dataset for masked language modeling pre-training"""

    def __init__(self, jsonl_paths: list[str], max_len=None, tokenizer=None, mask_prob=0.15):
        cfg = ModelConfig()
        self.max_len = max_len or cfg.max_seq_len
        self.pad_id = cfg.pad_token_id
        self.mask_id = cfg.mask_token_id
        self.mask_prob = mask_prob
        self.tok = tokenizer or load_tokenizer()
        self.vocab_size = self.tok.get_vocab_size()
        self.texts = []

        for path in jsonl_paths:
            if not os.path.exists(path):
                continue
            with open(path) as f:
                for line in f:
                    try:
                        obj = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue
                    payload_text = json.dumps(obj.get("payload", obj), separators=(",", ":"))
                    self.texts.append(payload_text)

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        encoded = self.tok.encode(text)
        ids = encoded.ids[:self.max_len]

        # mask tokens for MLM
        input_ids = list(ids)
        labels = [-100] * len(ids)  # -100 = ignore in cross entropy

        for i in range(len(input_ids)):
            if input_ids[i] in (self.pad_id, 1):  # skip special tokens ([PAD], [CLS])
                continue
            if random.random() < self.mask_prob:
                labels[i] = input_ids[i]
                roll = random.random()
                if roll < 0.8:
                    input_ids[i] = self.mask_id   # 80% → [MASK]
                elif roll < 0.9:
                    input_ids[i] = random.randint(5, self.vocab_size - 1)  # 10% → random token
                # 10% → keep original

        # pad
        pad_len = self.max_len - len(input_ids)
        input_ids = input_ids + [self.pad_id] * pad_len
        labels = labels + [-100] * pad_len
        attn_mask = [1] * len(ids) + [0] * pad_len

        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attn_mask, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }


def build_dataloaders(data_dir, batch_size=32, max_len=512, split_ratio=0.9):
    """convenience to build train/val loaders for fine-tuning"""
    benign = os.path.join(data_dir, "benign_corpus.jsonl")
    attacks = os.path.join(data_dir, "attack_corpus.jsonl")
    ds = PayloadDataset([benign, attacks], max_len=max_len)

    n = len(ds)
    train_n = int(n * split_ratio)
    val_n = n - train_n
    train_ds, val_ds = torch.utils.data.random_split(ds, [train_n, val_n])

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader
