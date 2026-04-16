import torch
import torch.nn.functional as F
import numpy as np

class FGSMAttacker:
    """
    Red Team AI: Implements Fast Gradient Sign Method (FGSM) to compute continuous
    adversarial perturbations against the semantic engine.
    """
    def __init__(self, model, tokenizer, device="cuda" if torch.cuda.is_available() else "cpu"):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device
        self.model.eval()
        
        # cache the entire vocabulary embedding matrix for fast nearest-neighbor lookup
        with torch.no_grad():
            self.vocab_embeds = self.model.encoder.token_emb.weight.detach() # shape: (vocab_size, hidden_dim)
            # normalize for cosine similarity
            self.vocab_embeds_norm = F.normalize(self.vocab_embeds, p=2, dim=-1)

    def generate_bypass(self, text, target_label_id, epsilon=0.05, max_steps=10):
        """
        Takes a DENY text payload and iteratively perturbs its embeddings using FGSM
        to trick the model into predicting target_label_id (e.g. ALLOW).
        
        Returns the generated adversarial text.
        """
        enc = self.tokenizer.encode(text)
        ids = enc.ids[:512]
        seq_len = len(ids)
        
        input_ids = torch.tensor([ids], dtype=torch.long, device=self.device)
        attn_mask = torch.ones((1, seq_len), dtype=torch.long, device=self.device)
        target = torch.tensor([target_label_id], dtype=torch.long, device=self.device)
        
        # 1. get the initial continuous embeddings
        with torch.no_grad():
            embeds = self.model.encoder.token_emb(input_ids).detach()
        
        # 2. iterative FGSM
        for step in range(max_steps):
            embeds.requires_grad_(True)
            
            logits = self.model(inputs_embeds=embeds, attention_mask=attn_mask)
            
            # check if we succeeded
            pred_id = logits.argmax(dim=-1).item()
            if pred_id == target_label_id:
                break
                
            loss = F.cross_entropy(logits, target)
            
            # backprop to get gradients w.r.t the continuous embeddings
            self.model.zero_grad()
            loss.backward()
            
            data_grad = embeds.grad.data
            
            # 3. Apply perturbation: descent towards target label
            adv_embeds = embeds - epsilon * torch.sign(data_grad)
            
            # detach for next iteration
            embeds = adv_embeds.detach()

        # 4. Snap the continuous perturbed embeddings back to discrete tokens
        # For each position, find the token in the vocab that has the highest cosine similarity
        adv_embeds_norm = F.normalize(embeds.squeeze(0), p=2, dim=-1) # (seq_len, hidden_dim)
        
        # Matrix multiply: (seq_len, hidden_dim) x (hidden_dim, vocab_size) = (seq_len, vocab_size)
        sim = torch.matmul(adv_embeds_norm, self.vocab_embeds_norm.T)
        
        # get the index of the max similarity per position
        best_token_ids = sim.argmax(dim=-1)
        
        # decode back to string
        # filter out [PAD] and [UNK] just in case
        adv_ids = best_token_ids.cpu().numpy().tolist()
        adv_text = self.tokenizer.decode(adv_ids)
        
        return adv_text, pred_id == target_label_id
