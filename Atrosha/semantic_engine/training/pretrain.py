import os
import sys
import time
import torch
import torch.nn as nn

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import ModelConfig, TrainConfig
from model.atrosha_model import AtroshaPretrainModel
from data.dataset import PretrainDataset
from torch.utils.data import DataLoader


def pretrain(data_dir=None, cfg=None, tcfg=None):
    cfg = cfg or ModelConfig()
    tcfg = tcfg or TrainConfig()

    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")

    device = torch.device(tcfg.device)

    print("[*] loading pre-training data...")
    benign = os.path.join(data_dir, "benign_corpus.jsonl")
    attacks = os.path.join(data_dir, "attack_corpus.jsonl")
    ds = PretrainDataset([benign, attacks], max_len=512, mask_prob=tcfg.mask_prob)
    loader = DataLoader(ds, batch_size=tcfg.pretrain_batch, shuffle=True, drop_last=True)
    print(f"[+] {len(ds)} samples, {len(loader)} batches/epoch")

    model = AtroshaPretrainModel(cfg).to(device)
    print(f"[+] model params: {model.param_count():,}")

    optimizer = torch.optim.AdamW(
        model.parameters(), lr=tcfg.pretrain_lr, weight_decay=tcfg.weight_decay
    )

    # linear warmup then cosine decay
    total_steps = len(loader) * tcfg.pretrain_epochs
    warmup = tcfg.warmup_steps

    def lr_lambda(step):
        if step < warmup:
            return step / max(warmup, 1)
        progress = (step - warmup) / max(total_steps - warmup, 1)
        return 0.5 * (1 + __import__("math").cos(__import__("math").pi * progress))

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    loss_fn = nn.CrossEntropyLoss(ignore_index=-100)

    os.makedirs(tcfg.checkpoint_dir, exist_ok=True)
    step = 0

    for epoch in range(tcfg.pretrain_epochs):
        model.train()
        epoch_loss = 0
        t0 = time.time()

        for batch in loader:
            input_ids = batch["input_ids"].to(device)
            attn_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            logits = model(input_ids, attn_mask)  # (B, T, vocab_size)
            loss = loss_fn(logits.view(-1, cfg.vocab_size), labels.view(-1))

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), tcfg.max_grad_norm)
            optimizer.step()
            scheduler.step()

            epoch_loss += loss.item()
            step += 1

            if step % 100 == 0:
                lr_now = scheduler.get_last_lr()[0]
                print(f"  step {step} | loss={loss.item():.4f} | lr={lr_now:.2e}")

        avg = epoch_loss / len(loader)
        elapsed = time.time() - t0
        print(f"[epoch {epoch+1}/{tcfg.pretrain_epochs}] loss={avg:.4f} ({elapsed:.1f}s)")

        # save checkpoint
        ckpt_path = os.path.join(tcfg.checkpoint_dir, f"pretrain_epoch{epoch+1}.pt")
        torch.save({
            "epoch": epoch + 1,
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "loss": avg,
        }, ckpt_path)

    print(f"[+] pre-training complete. {step} total steps.")
    return model


if __name__ == "__main__":
    pretrain()
