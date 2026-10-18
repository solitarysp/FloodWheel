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

    print(f"Starting download of {len(catalog)} benchmark images (10 flooded + 10 dry scenarios)...")

    success_count = 0
    for idx, item in enumerate(catalog, 1):
        filename = f"{item['id']}_{item['category']}.jpg"
        target_path = os.path.join(OUTPUT_DIR, filename)

        print(f"[{idx}/{len(catalog)}] Downloading: {item['title']} -> {filename}...")

        try:
            req = urllib.request.Request(item["image_url"], headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as resp, open(target_path, "wb") as out:
                content = resp.read()
                out.write(content)
            size_kb = os.path.getsize(target_path) / 1024
            print(f"  ✓ Saved successfully: {target_path} ({size_kb:.1f} KB)")
            success_count += 1
        except Exception as e:
            print(f"  ✗ Error downloading {item['id']}: {e}")

    print(f"\nComplete! Successfully downloaded {success_count}/{len(catalog)} images into: {OUTPUT_DIR}")


if __name__ == "__main__":
    download_all()
