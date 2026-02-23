import os
import sys
import time
import torch
import torch.nn as nn

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import ModelConfig, TrainConfig, LABELS
from model.atrosha_model import AtroshaSemanticModel
from data.dataset import build_dataloaders


def finetune(data_dir=None, pretrain_ckpt=None, cfg=None, tcfg=None):
    cfg = cfg or ModelConfig()
    tcfg = tcfg or TrainConfig()

    if data_dir is None:
        data_dir = os.path.join(os.path.dirname(__file__), "..", "data")

    device = torch.device(tcfg.device)

    print("[*] building dataloaders...")
    train_loader, val_loader = build_dataloaders(
        data_dir, batch_size=tcfg.finetune_batch, max_len=512
    )
    print(f"[+] train={len(train_loader.dataset)}, val={len(val_loader.dataset)}")

    model = AtroshaSemanticModel(cfg).to(device)

    # load pre-trained encoder weights if available
    if pretrain_ckpt and os.path.exists(pretrain_ckpt):
        print(f"[*] loading pre-trained weights from {pretrain_ckpt}")
        ckpt = torch.load(pretrain_ckpt, map_location=device, weights_only=True)
        # the pretrain model has encoder + mlm_head; we only want encoder
        encoder_state = {
            k.replace("encoder.", ""): v
            for k, v in ckpt["model_state"].items()
            if k.startswith("encoder.")
        }
        model.encoder.load_state_dict(encoder_state)
        print("[+] encoder weights loaded")

    optimizer = torch.optim.AdamW(
        model.parameters(), lr=tcfg.finetune_lr, weight_decay=tcfg.weight_decay
    )
    loss_fn = nn.CrossEntropyLoss()

    os.makedirs(tcfg.checkpoint_dir, exist_ok=True)
    best_acc = 0.0

    for epoch in range(tcfg.finetune_epochs):
        # --- train ---
        model.train()
        total_loss, correct, total = 0, 0, 0
        t0 = time.time()

        for batch in train_loader:
            input_ids = batch["input_ids"].to(device)
            attn_mask = batch["attention_mask"].to(device)
            labels = batch["label"].to(device)

            logits = model(input_ids, attn_mask)
            loss = loss_fn(logits, labels)

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), tcfg.max_grad_norm)
            optimizer.step()

            total_loss += loss.item() * labels.size(0)
            preds = logits.argmax(dim=-1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

        train_acc = correct / total
        train_loss = total_loss / total
        elapsed = time.time() - t0

        # --- validate ---
        model.eval()
        val_correct, val_total = 0, 0
        val_loss_sum = 0

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch["input_ids"].to(device)
                attn_mask = batch["attention_mask"].to(device)
                labels = batch["label"].to(device)

                logits = model(input_ids, attn_mask)
                loss = loss_fn(logits, labels)

                val_loss_sum += loss.item() * labels.size(0)
                preds = logits.argmax(dim=-1)
                val_correct += (preds == labels).sum().item()
                val_total += labels.size(0)

        val_acc = val_correct / val_total
        val_loss = val_loss_sum / val_total

        print(
            f"[epoch {epoch+1}/{tcfg.finetune_epochs}] "
            f"train_loss={train_loss:.4f} train_acc={train_acc:.3f} | "
            f"val_loss={val_loss:.4f} val_acc={val_acc:.3f} ({elapsed:.1f}s)"
        )

        # save best model
        if val_acc > best_acc:
            best_acc = val_acc
            best_path = os.path.join(tcfg.checkpoint_dir, "best_model.pt")
            torch.save({
                "epoch": epoch + 1,
                "model_state": model.state_dict(),
                "val_acc": val_acc,
                "config": cfg,
            }, best_path)
            print(f"  [*] new best model saved (val_acc={val_acc:.3f})")

    print(f"\n[+] fine-tuning complete. best val_acc={best_acc:.3f}")
    return model


if __name__ == "__main__":
    finetune()
