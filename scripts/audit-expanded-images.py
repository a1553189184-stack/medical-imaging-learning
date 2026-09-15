from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "data" / "expanded-case-sources.json").read_text(encoding="utf-8"))
records = manifest["records"]
out_dir = ROOT / "outputs" / "image-audit"
out_dir.mkdir(parents=True, exist_ok=True)


def dhash(image: Image.Image) -> int:
    gray = ImageOps.grayscale(image).resize((9, 8), Image.Resampling.LANCZOS)
    pixels = list(gray.get_flattened_data())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | int(pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return bits


def hamming(left: int, right: int) -> int:
    return (left ^ right).bit_count()


hashes: list[tuple[dict, int]] = []
seen_local: set[str] = set()
errors: list[str] = []
for record in records:
    path = ROOT / record["image"]
    try:
        payload = path.read_bytes()
        local = hashlib.sha256(payload).hexdigest()
        if local != record["localSha256"]:
            errors.append(f"hash mismatch: {record['id']}")
        if local in seen_local:
            errors.append(f"byte duplicate: {record['id']}")
        seen_local.add(local)
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            hashes.append((record, dhash(ImageOps.exif_transpose(image).convert("RGB"))))
    except Exception as exc:  # noqa: BLE001
        errors.append(f"decode failure: {record['id']}: {exc}")

near: list[dict] = []
for index, (left, left_hash) in enumerate(hashes):
    for right, right_hash in hashes[index + 1 :]:
        distance = hamming(left_hash, right_hash)
        if distance <= 4:
            near.append({"distance": distance, "left": left["id"], "right": right["id"]})

font = ImageFont.load_default()
for system in ["胸部", "神经", "腹部", "骨骼"]:
    group = [record for record in records if record["system"] == system]
    for page_number in range(0, len(group), 25):
        page = group[page_number : page_number + 25]
        sheet = Image.new("RGB", (1200, 1025), "#161a1d")
        draw = ImageDraw.Draw(sheet)
        for position, record in enumerate(page):
            col, row = position % 5, position // 5
            x, y = col * 240, row * 205
            with Image.open(ROOT / record["image"]) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((224, 165), Image.Resampling.LANCZOS)
                tile = Image.new("RGB", (224, 165), "black")
                tile.paste(image, ((224 - image.width) // 2, (165 - image.height) // 2))
                sheet.paste(tile, (x + 8, y + 8))
            draw.text((x + 8, y + 178), record["id"], fill="white", font=font)
        sheet.save(out_dir / f"{records.index(page[0]):03d}-{system}-{page_number // 25 + 1}.jpg", quality=90)

report = {"count": len(records), "decodeErrors": errors, "nearDuplicates": near}
latest_ids = {record["id"] for record in records if "-1506-" in record["id"]}
latest_near = [
    item for item in near
    if item["distance"] <= 1 and (item["left"] in latest_ids or item["right"] in latest_ids)
]
report["latestExpansion"] = {"ids": len(latest_ids), "nearDuplicateAtDistance1OrLess": latest_near}
(out_dir / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Keep a dedicated contact-sheet set for the most recent extension, rather than
# mixing it with legacy images that have already completed review.
for system in ["胸部", "神经", "腹部", "骨骼"]:
    group = [record for record in records if record["id"] in latest_ids and record["system"] == system]
    for page_number in range(0, len(group), 25):
        page = group[page_number : page_number + 25]
        sheet = Image.new("RGB", (1200, 1025), "#161a1d")
        draw = ImageDraw.Draw(sheet)
        for position, record in enumerate(page):
            col, row = position % 5, position // 5
            x, y = col * 240, row * 205
            with Image.open(ROOT / record["image"]) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((224, 165), Image.Resampling.LANCZOS)
                tile = Image.new("RGB", (224, 165), "black")
                tile.paste(image, ((224 - image.width) // 2, (165 - image.height) // 2))
                sheet.paste(tile, (x + 8, y + 8))
            draw.text((x + 8, y + 178), record["id"], fill="white", font=font)
        sheet.save(out_dir / f"review-1506-{system}-{page_number // 25 + 1}.jpg", quality=92)
print(json.dumps({"count": len(records), "errors": len(errors), "nearDuplicatePairs": len(near)}, ensure_ascii=False))
for item in near[:80]:
    print(f"dHash {item['distance']}: {item['left']} <> {item['right']}")
if latest_near:
    print(f"new expansion has {len(latest_near)} perceptual duplicates at distance <= 1")
    raise SystemExit(3)
if errors:
    raise SystemExit(2)
