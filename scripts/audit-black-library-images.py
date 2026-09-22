import json
from pathlib import Path

from PIL import Image, ImageStat

root = Path(__file__).resolve().parents[1]
paths = set()
for library_path in (root / "library-data").glob("authorized-*-library.json"):
    if library_path.name == "authorized-library-manifest.json":
        continue
    library = json.loads(library_path.read_text(encoding="utf-8"))
    for record in library.get("records", []):
        for image in record.get("images", []):
            if image.get("src"):
                paths.add(image["src"])

results = []
failures = []
for relative in sorted(paths):
    try:
        with Image.open(root / relative) as image:
            gray = image.convert("L")
            gray.thumbnail((256, 256))
            mean = ImageStat.Stat(gray).mean[0]
            pixels = list(gray.getdata())
            visible_ratio = sum(value > 18 for value in pixels) / max(1, len(pixels))
            results.append((mean, visible_ratio, image.width, image.height, relative))
    except Exception as error:
        failures.append((relative, str(error)))

print(f"audited={len(results)} failures={len(failures)}")
for mean, visible_ratio, width, height, relative in sorted(results)[:30]:
    print(f"mean={mean:6.2f} visible={visible_ratio:6.2%} size={width}x{height} {relative}")
for relative, error in failures:
    print(f"ERROR {relative}: {error}")
