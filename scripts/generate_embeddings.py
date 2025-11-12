"""Generate OpenAI embeddings for the vocabulary master list."""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Iterable

from openai import OpenAI, OpenAIError, RateLimitError


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate OpenAI embeddings for vocabulary.js on disk")
    parser.add_argument("--vocab", type=Path, default=Path("data/vocabulary.json"), help="Vocabulary JSON")
    parser.add_argument("--out", type=Path, default=Path("data/vocab-embeddings.jsonl"), help="JSONL output path")
    parser.add_argument("--batch", type=int, default=50, help="Number of words per embeddings request")
    parser.add_argument("--model", default="text-embedding-ada-002", help="OpenAI embedding model")
    parser.add_argument("--sleep", type=float, default=1.0, help="Seconds to wait between requests")
    parser.add_argument("--resume", action="store_true", help="Skip words that already exist in the output file")
    parser.add_argument("--prompt", default="", help="Extra prompt text appended to each word" )
    return parser.parse_args()


def load_existing_ids(path: Path) -> set[int]:
    if not path.exists():
        return set()
    ids: set[int] = set()
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get("id") is not None:
                ids.add(int(record["id"]))
    return ids


def chunks(data: Iterable, size: int) -> Iterable[list]:
    batch: list = []
    for item in data:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def main() -> None:
    args = parse_args()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OpenAI API key not set. Export OPENAI_API_KEY in your environment.")
    client = OpenAI(api_key=api_key)
    vocab = json.loads(args.vocab.read_text(encoding="utf-8"))
    resume_ids = load_existing_ids(args.out) if args.resume else set()
    records = [item for item in vocab if isinstance(item.get("id"), int) and item["id"] not in resume_ids]

    total = len(records)
    processed = 0
    print(f"Embedding {total} words (resume={args.resume})")

    with args.out.open("a", encoding="utf-8") as writer:
        for batch in chunks(records, args.batch):
            batch_start = processed + 1
            batch_end = processed + len(batch)
            print(f"Processing words {batch_start}-{batch_end} / {total}")
            inputs = [f"{item['word']} {args.prompt}".strip() for item in batch]
            response = None
            backoff = 1.0
            while True:
                try:
                    response = client.embeddings.create(model=args.model, input=inputs)
                except RateLimitError:
                    print("Rate limited, backing off", backoff)
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 10)
                    continue
                except OpenAIError as exc:
                    print(f"OpenAI error: {exc}")
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 10)
                    continue
                break
            for datum, item in zip(response.data, batch):
                payload = {
                    "id": item["id"],
                    "word": item["word"],
                    "difficulty_score": item.get("difficulty_score"),
                    "embedding": datum.embedding,
                }
                writer.write(json.dumps(payload, ensure_ascii=False))
                writer.write("\n")
            processed = batch_end
            time.sleep(args.sleep)


if __name__ == "__main__":
    main()
