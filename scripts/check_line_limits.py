#!/usr/bin/env python3
"""
Script kiem tra so dong code cua cac file trong project FloodWheel.
Rule:
  - Canh bao (Warning) khi file > 200 dong (khuyen nghi <= 200).
  - Vi pham (Violation) khi file > 250 dong (quy tac cung).
"""

import os
import sys
from pathlib import Path

# Cac thu muc can quet
TARGET_DIRS = ["frontend", "backend", "camera-backend"]

# Cac file extensions can kiem tra
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py"}

# Cac thu muc va file bo qua
IGNORE_DIRS = {
    "node_modules",
    ".next",
    "out",
    "build",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    ".git",
    ".idea",
    ".playwright-mcp",
}

MAX_LINES_HARD = 250
MAX_LINES_WARN = 200


def count_lines(filepath: Path) -> int:
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def main():
    root = Path(__file__).resolve().parent.parent
    violations = []
    warnings = []
    total_files = 0

    for target in TARGET_DIRS:
        target_path = root / target
        if not target_path.exists():
            continue

        for dirpath, dirnames, filenames in os.walk(target_path):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for fname in filenames:
                fpath = Path(dirpath) / fname
                if fpath.suffix in EXTENSIONS:
                    total_files += 1
                    lines = count_lines(fpath)
                    rel_path = fpath.relative_to(root)

                    if lines > MAX_LINES_HARD:
                        violations.append((str(rel_path), lines))
                    elif lines > MAX_LINES_WARN:
                        warnings.append((str(rel_path), lines))

    violations.sort(key=lambda x: x[1], reverse=True)
    warnings.sort(key=lambda x: x[1], reverse=True)

    print("=" * 70)
    print(" FLOODWHEEL - KIEM TRA SO DONG CODE MOI FILE")
    print(f" Quy tac: Toi da {MAX_LINES_HARD} dong/file (Khuyen nghi <= {MAX_LINES_WARN} dong)")
    print("=" * 70)
    print(f"Tong so file da quet: {total_files}\n")

    if violations:
        print(f"❌ [VI PHAM] Cac file vuot qua {MAX_LINES_HARD} dong ({len(violations)} file):")
        for path, count in violations:
            print(f"  - {count:4d} dong : {path}")
        print()

    if warnings:
        print(f"⚠️  [CANH BAO] Cac file trong nguong {MAX_LINES_WARN+1}-{MAX_LINES_HARD} dong ({len(warnings)} file):")
        for path, count in warnings:
            print(f"  - {count:4d} dong : {path}")
        print()

    if not violations and not warnings:
        print("✅ Tuyet voi! Tat ca file deu <= 200 dong.\n")
    elif not violations:
        print(f"✅ Khong co file nao vuot qua nguong cung {MAX_LINES_HARD} dong.\n")

    print("-" * 70)
    print(f"Ket qua: {len(violations)} vi pham | {len(warnings)} canh bao tren tong {total_files} file.")
    print("-" * 70)

    # Return exit code: 1 neu co vi pham hard limit (>250 dong), 0 neu pass
    if violations:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
