"""Build vocabulary assets from the CSV master list."""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
from pathlib import Path


DIFFICULTY_LEVELS: list[tuple[str, int, int]] = [
    ("超基本", 1, 100),
    ("基本", 101, 500),
    ("中学", 501, 1000),
    ("高校基礎", 1001, 1500),
    ("高校標準", 1501, 2000),
    ("高校上級", 2001, 2500),
    ("大学", 2501, 3000),
    ("最上級", 3001, 3500),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build CSV -> SQLite/JSON assets for vocabulary")
    parser.add_argument("--csv", type=Path, default=Path("vocabulary_new.csv"), help="Master CSV file")
    parser.add_argument("--db", type=Path, default=Path("data/vocabulary.db"), help="Output SQLite file")
    parser.add_argument("--json", type=Path, default=Path("data/vocabulary.json"), help="Output JSON file")
    parser.add_argument("--no-json", action="store_true", help="Skip writing JSON output")
    parser.add_argument("--no-db", action="store_true", help="Skip writing SQLite output")
    parser.add_argument("--sort-by", choices=["id", "word", "difficulty_score"], help="Sort rows by this column before emitting")
    parser.add_argument("--renumber", action="store_true", help="Renumber IDs sequentially after sorting")
    parser.add_argument("--scale-difficulty", action="store_true", help="Remap difficulty_score into the 5-10000 band and recompute thresholds")
    parser.add_argument("--difficulty-min", type=int, default=5, help="Minimum value for the remapped difficulty score")
    parser.add_argument("--difficulty-max", type=int, default=10000, help="Maximum value for the remapped difficulty score")
    parser.add_argument("--difficulty-scale-alpha", type=float, default=0.0, help="Softly nudge difficulty scores toward the center (0 = linear, higher = more emphasis)")
    parser.add_argument("--thresholds-json", type=Path, default=Path("data/difficulty-thresholds.json"), help="Write scaled threshold ranges to JSON when difficulty scaling is enabled")
    return parser.parse_args()


def _clean_row(row: dict[str, str]) -> dict[str, str | int | None]:
    cleaned: dict[str, str | int | None] = {}
    for key, value in row.items():
        value = value.strip()
        if not value:
            cleaned[key] = None
            continue
        if key in {"id", "difficulty_score"}:
            try:
                cleaned[key] = int(value)
            except ValueError:
                cleaned[key] = float(value)
        else:
            cleaned[key] = value
    return cleaned


def _score_bounds(rows: list[dict[str, str | int | None]]) -> tuple[int, int]:
    scores = [int(row["difficulty_score"]) for row in rows if isinstance(row.get("difficulty_score"), (int, float))]
    if not scores:
        raise ValueError("no numeric difficulty_score values found")
    return min(scores), max(scores)


def _scaled_score(value: int, min_score: int, max_score: int, alpha: float, target_min: int, target_max: int) -> int:
    if max_score <= min_score:
        return target_min
    norm = (value - min_score) / (max_score - min_score)
    soft = norm + alpha * norm * (1 - norm)
    soft = max(0.0, min(1.0, soft))
    scaled = target_min + soft * (target_max - target_min)
    return round(scaled)


def _apply_difficulty_scale(
    rows: list[dict[str, str | int | None]], min_score: int, max_score: int, alpha: float, target_min: int, target_max: int
) -> None:
    for row in rows:
        value = row.get("difficulty_score")
        if value is None:
            continue
        row["difficulty_score"] = _scaled_score(int(value), min_score, max_score, alpha, target_min, target_max)


def _thresholds_from_scale(min_score: int, max_score: int, alpha: float, target_min: int, target_max: int) -> list[dict[str, int | str | list[int]]]:
    thresholds: list[dict[str, int | str | list[int]]] = []
    for name, start, end in DIFFICULTY_LEVELS:
        thresholds.append(
            {
                "label": name,
                "range": [start, end],
                "scaled_range": [
                    _scaled_score(start, min_score, max_score, alpha, target_min, target_max),
                    _scaled_score(end, min_score, max_score, alpha, target_min, target_max),
                ],
            }
        )
    return thresholds


def _write_thresholds(thresholds: list[dict[str, object]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(thresholds, ensure_ascii=False, indent=2))


def _print_thresholds(thresholds: list[dict[str, object]]) -> None:
    print("scaled difficulty thresholds:")
    for entry in thresholds:
        scaled = entry["scaled_range"]
        print(f"  {entry['label']}: {scaled[0]}-{scaled[1]}")


def build_sqlite(csv_rows: list[dict[str, str | int | None]], db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS vocabulary")
        cursor.execute(
            """
            CREATE TABLE vocabulary (
                id INTEGER PRIMARY KEY,
                word TEXT NOT NULL,
                part_of_speech TEXT,
                difficulty_score REAL,
                meaning_1 TEXT,
                meaning_2 TEXT,
                meaning_3 TEXT
            )
            """
        )
        insert_sql = """
        INSERT INTO vocabulary (id, word, part_of_speech, difficulty_score, meaning_1, meaning_2, meaning_3)
        VALUES (:id, :word, :part_of_speech, :difficulty_score, :meaning_1, :meaning_2, :meaning_3)
        """
        cursor.executemany(insert_sql, csv_rows)
        conn.commit()


def build_json(csv_rows: list[dict[str, str | int | None]], json_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(csv_rows, ensure_ascii=False, indent=2))


def read_csv(csv_path: Path) -> list[dict[str, str | int | None]]:
    if not csv_path.exists():
        raise FileNotFoundError(csv_path)
    with csv_path.open(newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        rows: list[dict[str, str | int | None]] = []
        for raw_row in reader:
            rows.append(_clean_row(raw_row))
        return rows


def _sort_rows(rows: list[dict[str, str | int | None]], key: str) -> list[dict[str, str | int | None]]:
    def key_fn(row: dict[str, str | int | None]) -> tuple:
        value = row.get(key)
        if value is None:
            return ("",)
        if isinstance(value, str):
            return (value.lower(),)
        return (value,)

    return sorted(rows, key=key_fn)


def _renumber(rows: list[dict[str, str | int | None]]) -> None:
    for idx, row in enumerate(rows, start=1):
        row["id"] = idx


def main() -> None:
    args = parse_args()
    rows = read_csv(args.csv)
    if args.sort_by:
        rows = _sort_rows(rows, args.sort_by)
    if args.renumber:
        _renumber(rows)
    bounds = _score_bounds(rows)
    thresholds: list[dict[str, object]] | None = None
    if args.scale_difficulty:
        print(
            f"Rescaling difficulty_score into {args.difficulty_min}-{args.difficulty_max} band (alpha={args.difficulty_scale_alpha})"
        )
        _apply_difficulty_scale(
            rows,
            bounds[0],
            bounds[1],
            args.difficulty_scale_alpha,
            args.difficulty_min,
            args.difficulty_max,
        )
        thresholds = _thresholds_from_scale(
            bounds[0],
            bounds[1],
            args.difficulty_scale_alpha,
            args.difficulty_min,
            args.difficulty_max,
        )
        _print_thresholds(thresholds)
        if args.thresholds_json:
            print(f"Writing thresholds to: {args.thresholds_json}")
            _write_thresholds(thresholds, args.thresholds_json)
    if not args.no_db:
        print(f"Writing {len(rows)} records to SQLite: {args.db}")
        build_sqlite(rows, args.db)
    if not args.no_json:
        print(f"Writing JSON asset: {args.json}")
        build_json(rows, args.json)


if __name__ == "__main__":
    main()
