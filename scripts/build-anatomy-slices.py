"""Build independent, sequential teaching slices from 3D Slicer SampleData.

The source NRRD files are downloaded separately and verified by SHA-256.
No page or illustration from the user's scanned books is copied.
"""

import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image


SOURCES = {
    "chest": {
        "file": "CT-chest.nrrd",
        "sha256": "4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e",
        "url": "https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/4507b664690840abb6cb9af2d919377ffc4ef75b167cb6fd0f747befdb12e38e",
    },
    "head": {
        "file": "MR-head.nrrd",
        "sha256": "cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93",
        "url": "https://github.com/Slicer/SlicerTestingData/releases/download/SHA256/cc211f0dfd9a05ca3841ce1141b292898b2dd2d3f08286affadf823a7e58df93",
    },
}


def read_nrrd(path: Path):
    data = path.read_bytes()
    header, packed = data.split(b"\n\n", 1)
    fields = dict(line.split(": ", 1) for line in header.decode("ascii").splitlines() if ": " in line)
    sizes = [int(value) for value in fields["sizes"].split()]
    dtype = {"int": "<i4", "short": "<i2"}[fields["type"]]
    volume = np.frombuffer(gzip.decompress(packed), dtype=dtype).reshape(tuple(reversed(sizes)))
    return volume, fields


def grey_window(image, center, width):
    return np.clip((image.astype(np.float32) - (center - width / 2)) * 255 / width, 0, 255).astype(np.uint8)


def write_stack(volume, target: Path, window):
    target.mkdir(parents=True, exist_ok=True)
    for index, image in enumerate(volume):
        Image.fromarray(grey_window(image, *window), "L").save(target / f"{index:03d}.webp", "WEBP", quality=82, method=6)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    metadata = {}
    for name, source in SOURCES.items():
        path = args.source_dir / source["file"]
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != source["sha256"]:
            raise ValueError(f"SHA-256 mismatch: {path}")
        volume, fields = read_nrrd(path)
        if name == "chest":
            write_stack(volume, out / "chest" / "soft", (40, 400))
            write_stack(volume, out / "chest" / "lung", (-600, 1500))
            metadata[name] = {"title": "胸部 CT · 轴位", "count": len(volume), "width": 512, "height": 512, "spacingMm": 2.5, "views": ["soft", "lung"], "source": source["url"], "sha256": actual}
        else:
            top = float(np.percentile(volume, 99.5))
            write_stack(volume, out / "head" / "sagittal", (top / 2, top))
            metadata[name] = {"title": "头部 MRI · 矢状位", "count": len(volume), "width": 256, "height": 256, "spacingMm": 1.3, "views": ["sagittal"], "source": source["url"], "sha256": actual}
    (out / "slices.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print({key: value["count"] for key, value in metadata.items()})


if __name__ == "__main__":
    main()
