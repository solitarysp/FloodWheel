#!/usr/bin/env python3
"""Downloads the 20 benchmark flood and dry images from verified high-reliability CDN."""

import json
import os
import sys
import urllib.request

DATASET_FILE = os.path.join(os.path.dirname(__file__), "dataset", "images_catalog.json")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "images")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def download_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    print(f"Bắt đầu tải {len(catalog)} ảnh benchmark (10 ảnh ngập lụt + 10 ảnh khô ráo)...")

    success_count = 0
    for idx, item in enumerate(catalog, 1):
        filename = f"{item['id']}_{item['category']}.jpg"
        target_path = os.path.join(OUTPUT_DIR, filename)

        print(f"[{idx}/{len(catalog)}] Đang tải: {item['title']} -> {filename}...")

        try:
            req = urllib.request.Request(item["image_url"], headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp, open(target_path, "wb") as out:
                content = resp.read()
                out.write(content)
            size_kb = os.path.getsize(target_path) / 1024
            print(f"  ✓ Đã lưu thành công: {target_path} ({size_kb:.1f} KB)")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Lỗi khi tải ảnh {item['id']}: {e}")

    print(f"\nHoàn tất! Đã tải thành công {success_count}/{len(catalog)} ảnh vào thư mục: {OUTPUT_DIR}")


if __name__ == "__main__":
    download_all()
