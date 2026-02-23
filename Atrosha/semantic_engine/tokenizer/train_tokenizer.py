import json
import os
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, processors, decoders

# trains a byte-pair encoding tokenizer specifically optimized for
# JSON payloads, API URLs, and financial vocabulary

def build_tokenizer(corpus_paths: list[str], vocab_size=16384, out_path=None):
    if out_path is None:
        out_path = os.path.join(os.path.dirname(__file__), "tokenizer.json")

    tok = Tokenizer(models.BPE(unk_token="[UNK]"))

    # split on whitespace + punctuation but keep JSON structure tokens together
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()

    special_tokens = ["[PAD]", "[CLS]", "[MASK]", "[SEP]", "[UNK]"]

    trainer = trainers.BpeTrainer(
        vocab_size=vocab_size,
        special_tokens=special_tokens,
        min_frequency=2,
        show_progress=True,
    )

    # flatten jsonl corpus files into raw text lines for training
    text_lines = _extract_text_lines(corpus_paths)
    tmp_file = os.path.join(os.path.dirname(__file__), "_tok_train_tmp.txt")
    with open(tmp_file, "w", encoding="utf-8") as f:
        for line in text_lines:
            f.write(line + "\n")

    tok.train([tmp_file], trainer)

    # post-processor: add [CLS] at start
    cls_id = tok.token_to_id("[CLS]")
    sep_id = tok.token_to_id("[SEP]")
    tok.post_processor = processors.TemplateProcessing(
        single=f"[CLS] $A [SEP]",
        pair=f"[CLS] $A [SEP] $B:1 [SEP]:1",
        special_tokens=[("[CLS]", cls_id), ("[SEP]", sep_id)],
    )

    tok.save(out_path)
    os.remove(tmp_file)
    print(f"[+] tokenizer saved to {out_path} (vocab_size={tok.get_vocab_size()})")
    return tok


def _extract_text_lines(paths):
    """flatten jsonl payloads into raw text suitable for BPE training"""
    lines = []
    for path in paths:
        if not os.path.exists(path):
            print(f"[!] skipping missing file: {path}")
            continue
        with open(path) as f:
            for raw in f:
                try:
                    obj = json.loads(raw.strip())
                except json.JSONDecodeError:
                    continue
                # recursively serialize the payload to text
                payload = obj.get("payload", obj)
                lines.append(json.dumps(payload, separators=(",", ":")))
                # also dump individual string fields for richer token coverage
                _walk_strings(payload, lines)
    return lines


def _walk_strings(obj, out):
    """recursively extract all string values from nested dicts/lists"""
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            _walk_strings(v, out)
    elif isinstance(obj, list):
        for item in obj:
            _walk_strings(item, out)


def load_tokenizer(path=None):
    if path is None:
        path = os.path.join(os.path.dirname(__file__), "tokenizer.json")
    return Tokenizer.from_file(path)


if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    benign = os.path.join(data_dir, "benign_corpus.jsonl")
    attacks = os.path.join(data_dir, "attack_corpus.jsonl")
    build_tokenizer([benign, attacks])
