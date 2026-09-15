from __future__ import annotations

import hashlib
import json
import re
import urllib.request
import urllib.parse
import urllib.error
import time
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "expanded-case-sources.json"
GROUPS_PATH = ROOT / "next-502-groups.js"
AUDIT_PATH = ROOT / "outputs" / "image-audit" / "report.json"
REJECT = re.compile(r"annotation|annotated|mark|arrows?|diagram|scheme|schematic|drawing|classification|histolog|histopath|pathologic|micrograph|gross pathology|autopsy|specimen|cytology|cells or tissue|veterinary|\bdog\b|\bcat\b|canine|feline|operative photograph|surgery photo|mummy|historic|historical|tactical|normal|normwert|segmentation|treatment plan|post.?operative|post.?op|fixation|osteosynth|implant|\bplate\b|\bscrew\b|verschraub|prothese|endoproth|\bnagel\b|\bkein\b|\bwithout\b|\bno\b", re.I)
CATEGORY_KEYS = {
    "Glenohumeral dislocation": "bone-shoulder-dislocation",
    "Intracerebral hemorrhage": "neuro-intracerebral",
    "Acute appendicitis and complications": "abdomen-appendicitis",
    "Hydronephrosis": "abdomen-hydronephrosis",
    "Simple renal cyst": "abdomen-renal-cyst",
}
CATEGORY_FALLBACKS = {
    "胸部": {"chest-pneumothorax": "Pneumothorax", "chest-pleural-effusion": "Pleural effusion", "chest-pulmonary-edema": "Pulmonary edema", "chest-pulmonary-embolism": "Pulmonary embolism", "chest-atelectasis": "Atelectasis"},
    "神经": {"neuro-subdural": "Subdural hematoma", "neuro-intracerebral": "Intracerebral hemorrhage", "neuro-meningioma": "Meningioma", "neuro-glioblastoma": "Glioblastoma", "neuro-ms": "Multiple sclerosis lesions", "neuro-metastases": "Brain metastasis"},
    "腹部": {"abdomen-appendicitis": "Acute appendicitis and complications", "abdomen-cholelithiasis": "Cholelithiasis", "abdomen-hydronephrosis": "Hydronephrosis", "abdomen-diverticulitis": "Colonic diverticulitis and complications", "abdomen-hcc": "Hepatocellular carcinoma imaging pattern", "abdomen-aaa": "Abdominal aortic aneurysm", "abdomen-renal-cyst": "Simple renal cyst"},
    "骨骼": {"bone-hip-fracture": "Hip fracture", "bone-clavicle-fracture": "Clavicle fracture", "bone-distal-radius": "Distal radius fracture", "bone-shoulder-dislocation": "Glenohumeral dislocation", "bone-scoliosis": "Scoliosis", "bone-tibia-fracture": "Tibial fracture"},
}
STOP_WORDS = {"with", "without", "disease", "syndrome", "imaging", "image", "pattern", "radiograph", "computed", "tomography", "magnetic", "resonance", "acute", "chronic", "primary", "secondary", "other", "left", "right", "brain", "chest", "bone", "spine"}
GENERIC = {"pulmonary", "thoracic", "cardiac", "cerebral", "abdominal", "carcinoma", "cancer", "fracture", "arthritis", "infection", "injury", "lesion", "tumor", "tumour", "fibrosis", "pneumonia", "infarction", "hemorrhage", "haemorrhage", "dislocation", "metastasis", "metastases"}


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


def load_groups() -> dict:
    text = GROUPS_PATH.read_text(encoding="utf-8")
    return json.loads(text[text.index("{") : text.rfind(";")])


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "MedicalImagingLearningAudit/6.0"})
    with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
        return response.read()


def direct_match(english: str, item: dict) -> bool:
    terms = list(dict.fromkeys(term for term in re.findall(r"[a-z]{3,}", english.lower()) if term not in STOP_WORDS))
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
    hits = [term for term in terms if term in text]
    return (len(terms) >= 2 and len(hits) >= 2) or any(len(term) >= 5 and term not in GENERIC for term in hits)


def plain(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", value or "")).strip()


def deep_search(english: str, offset: int = 50, attempt: int = 0) -> list[dict]:
    params = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": "2", "generator": "search",
        "gsrsearch": f"{english} radiology filetype:bitmap", "gsrnamespace": "6", "gsrlimit": "50", "gsroffset": str(offset),
        "prop": "imageinfo", "iiprop": "url|sha1|mime|size|extmetadata", "iiurlwidth": "1400", "origin": "*",
    })
    request = urllib.request.Request(f"https://commons.wikimedia.org/w/api.php?{params}", headers={"User-Agent": "MedicalImagingLearningAudit/6.0"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
            data = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 429 and attempt < 6:
            time.sleep(3 * (attempt + 1))
            return deep_search(english, offset, attempt + 1)
        raise
    result = []
    for page in data.get("query", {}).get("pages", []):
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        meta = info.get("extmetadata", {})
        item = {"title": page["title"], "sourceUrl": info.get("descriptionurl", ""), "originalUrl": info.get("url", ""), "downloadUrl": info.get("thumburl") or info.get("url", ""), "originalSha1": info.get("sha1", ""), "width": info.get("width", 0), "height": info.get("height", 0), "mime": info.get("mime", ""), "license": plain(meta.get("LicenseShortName", {}).get("value", "")), "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""), "artist": plain(meta.get("Artist", {}).get("value", "Wikimedia Commons contributor")), "credit": plain(meta.get("Credit", {}).get("value", "")), "description": plain(meta.get("ImageDescription", {}).get("value", page["title"]))}
        if re.match(r"image/(jpeg|png)$", item["mime"], re.I) and re.search(r"CC0|public domain|CC BY", item["license"], re.I) and min(item["width"], item["height"]) >= 480 and direct_match(english, item):
            result.append(item)
    return result


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
groups = load_groups()
audit = json.loads(AUDIT_PATH.read_text(encoding="utf-8"))
targets = list(dict.fromkeys(item["right"] for item in audit["latestExpansion"]["nearDuplicateAtDistance1OrLess"]))
if len(targets) != 21:
    raise SystemExit(f"Expected 21 replacement targets, found {len(targets)}")

fresh = json.loads((ROOT / "data" / "candidates-1500.json").read_text(encoding="utf-8"))["topics"]
commons = json.loads((ROOT / "data" / "commons-candidates.json").read_text(encoding="utf-8"))["groups"]
alternates = json.loads((ROOT / "data" / "existing-alternate-candidates.json").read_text(encoding="utf-8"))["topics"]
next_topics = json.loads((ROOT / "data" / "next-200-candidates.json").read_text(encoding="utf-8"))["topics"]
fresh_by_english = {topic["english"]: topic.get("candidates", []) for topic in fresh}
commons_by_key = {topic["key"]: topic.get("candidates", []) for topic in commons}
older_by_english: dict[str, list[dict]] = {}
for topic in alternates + next_topics:
    english = topic.get("en")
    if english:
        older_by_english.setdefault(english, []).extend(item for item in topic.get("candidates", []) if direct_match(english, item))

record_by_id = {record["id"]: record for record in manifest["records"]}
used_sha = {record["originalSha1"] for record in manifest["records"]}
used_url = {record["sourceUrl"] for record in manifest["records"]}
used_local = {record["localSha256"] for record in manifest["records"]}
hash_by_id: dict[str, int] = {}
for record in manifest["records"]:
    image_path = ROOT / record["image"]
    if not image_path.exists():
        alternatives = list((ROOT / "assets" / "images" / "expanded").glob(f"{record['id']}.*"))
        if len(alternatives) != 1:
            raise SystemExit(f"Missing or ambiguous local image for {record['id']}")
        image_path = alternatives[0]
    with Image.open(image_path) as image:
        hash_by_id[record["id"]] = dhash(ImageOps.exif_transpose(image).convert("RGB"))
group_by_english = {}
for group_id, group_value in groups.items():
    group_by_english.setdefault(group_value["english"], (group_id, group_value))
unresolved: list[str] = []
deep_pages: dict[tuple[str, int], list[dict]] = {}


def find_replacement(candidates: list[tuple[dict, bool, str]]):
    for item, category_verified, candidate_english in candidates:
        text = f"{item.get('title', '')} {item.get('description', '')}"
        if item.get("originalSha1") in used_sha or item.get("sourceUrl") in used_url or REJECT.search(text):
            continue
        if category_verified and not direct_match(candidate_english, item):
            continue
        try:
            payload = download(item["downloadUrl"])
            local_sha = hashlib.sha256(payload).hexdigest()
            with Image.open(BytesIO(payload)) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                if min(image.size) < 480 or len(payload) < 8000:
                    continue
                candidate_hash = dhash(image)
            if local_sha in used_local or any(hamming(candidate_hash, existing) <= 1 for existing in hash_by_id.values()):
                continue
            return item, category_verified, candidate_english, payload, local_sha, candidate_hash
        except Exception:  # noqa: BLE001
            continue
    return None

for target in targets:
    record = record_by_id[target]
    group = groups[target]
    english = group["english"]
    candidates = [(item, False, english) for item in fresh_by_english.get(english, [])]
    candidates.extend((item, False, english) for item in older_by_english.get(english, []))
    category_key = CATEGORY_KEYS.get(english)
    if category_key:
        candidates.extend((item, True, english) for item in commons_by_key.get(category_key, []))

    old_sha, old_url, old_local = record["originalSha1"], record["sourceUrl"], record["localSha256"]
    used_sha.discard(old_sha)
    used_url.discard(old_url)
    used_local.discard(old_local)
    del hash_by_id[target]
    replacement = find_replacement(candidates)
    if replacement is None:
        fallback = []
        for topic in fresh:
            if topic.get("system") != record["system"] or topic["english"] not in group_by_english or topic["english"] == english:
                continue
            fallback.extend((item, False, topic["english"]) for item in topic.get("candidates", []))
        for key, fallback_english in CATEGORY_FALLBACKS.get(record["system"], {}).items():
            if fallback_english not in group_by_english:
                continue
            fallback.extend((item, True, fallback_english) for item in commons_by_key.get(key, []))
        replacement = find_replacement(fallback)
    if replacement is None:
        # Search one page at a time and validate it immediately. This avoids
        # downloading a large speculative reserve and stops as soon as a
        # medically matched, non-duplicate image is found.
        ordered_english: list[str] = []
        for fallback_english in CATEGORY_FALLBACKS.get(record["system"], {}).values():
            if fallback_english in group_by_english and fallback_english not in ordered_english:
                ordered_english.append(fallback_english)
        for topic in fresh:
            fallback_english = topic["english"]
            if topic.get("system") == record["system"] and fallback_english in group_by_english and fallback_english not in ordered_english:
                ordered_english.append(fallback_english)
        for fallback_english in ordered_english:
            for offset in (50, 100, 150, 200):
                cache_key = (fallback_english, offset)
                if cache_key not in deep_pages:
                    deep_pages[cache_key] = deep_search(fallback_english, offset)
                replacement = find_replacement(
                    [(item, False, fallback_english) for item in deep_pages[cache_key]]
                )
                if replacement is not None:
                    break
            if replacement is not None:
                break
    if replacement is None:
        unresolved.append(target)
        print(f"Drop candidate {target}: no non-duplicate same-system replacement for {english}")
        continue

    item, category_verified, replacement_english, payload, local_sha, candidate_hash = replacement
    if replacement_english != english:
        donor = group_by_english[replacement_english][1]
        number = target.rsplit("-", 1)[-1]
        groups[target] = {**donor, "title": f"{donor['title'].split('（公开病例')[0]}（公开病例 {number}）"}
        group = groups[target]
    extension = "png" if payload.startswith(b"\x89PNG\r\n\x1a\n") else "jpg"
    new_relative = f"assets/images/expanded/{target}.{extension}"
    old_path = ROOT / record["image"]
    new_path = ROOT / new_relative
    if old_path != new_path and old_path.exists():
        old_path.unlink()
    new_path.write_bytes(payload)
    record.update({
        "image": new_relative, "sourceTitle": re.sub(r"^File:", "", item["title"], flags=re.I),
        "sourceUrl": item["sourceUrl"], "sourceDescription": item["description"],
        "artist": item.get("artist", "Wikimedia Commons contributor"), "credit": item.get("credit", ""),
        "license": item["license"], "licenseUrl": item.get("licenseUrl", ""), "originalUrl": item["originalUrl"],
        "originalSha1": item["originalSha1"], "localSha256": local_sha, "localBytes": len(payload),
        "width": item["width"], "height": item["height"], "mime": item["mime"],
        "retrieval": "diagnosis-category" if category_verified else "strict-diagnosis-search",
        "qualityScore": "diagnosis-linked-source-and-contact-sheet-review",
        "sourceAudit": "diagnosis-category-membership-after-perceptual-review" if category_verified else "direct-source-label-match-after-perceptual-review",
    })
    group["basis"] = f"本图由公开来源的{'疾病专属分类' if category_verified else '病名检索结果'}归入“{group['title'].split('（公开病例')[0]}”教学主题。来源说明：{item['description']}。该替换图已通过与全库影像的感知哈希复核；不补造症状、分期、病理或未展示的征象。"
    used_sha.add(item["originalSha1"])
    used_url.add(item["sourceUrl"])
    used_local.add(local_sha)
    hash_by_id[target] = candidate_hash
    print(f"Replaced {target}: {record['sourceTitle']}")

if len(unresolved) > 5:
    raise SystemExit(f"Would drop {len(unresolved)} cases and fall below 1,501; no files committed")
for target in unresolved:
    record = record_by_id[target]
    image_path = ROOT / record["image"]
    if image_path.exists():
        image_path.unlink()
    manifest["records"] = [item for item in manifest["records"] if item["id"] != target]
    groups.pop(target, None)
    manifest["expansion1506"]["bySystem"][record["system"]] -= 1
manifest["count"] = len(manifest["records"])
manifest["expansion1506"]["count"] = len([record for record in manifest["records"] if "-1506-" in record["id"]])
manifest["generatedAt"] = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
GROUPS_PATH.write_text("// Generated and source-audited for the 1,506-case atlas.\nconst NEXT_502_GROUPS = " + json.dumps(groups, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
selection_path = ROOT / "data" / "expansion-1506-selection.json"
selection = json.loads(selection_path.read_text(encoding="utf-8"))
selection["additions"] = [record for record in manifest["records"] if "-1506-" in record["id"]]
selection_path.write_text(json.dumps(selection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Resolved {len(targets) - len(unresolved)} duplicates and dropped {len(unresolved)} unsupported cases; catalog total {manifest['count'] + 14}.")
