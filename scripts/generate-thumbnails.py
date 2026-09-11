"""Generate lightweight, non-diagnostic atlas thumbnails.

Original files remain untouched and are used on detail/training pages. Thumbnails
are only used by the catalog grid to reduce transfer and decode cost.
"""

from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "images"
OUTPUT = ROOT / "assets" / "thumbnails"
MAX_SIZE = (560, 420)


def output_path(path: Path) -> Path:
    return OUTPUT / path.relative_to(SOURCE).with_suffix(".webp")


def main() -> None:
    images = sorted(
        path
        for path in SOURCE.rglob("*")
        if path.is_file()
        and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        and "thumbnails" not in path.parts
    )
    for source in images:
        target = output_path(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            image = ImageOps.exif_transpose(image)
            if image.mode not in {"RGB", "L"}:
                background = Image.new("RGB", image.size, "black")
                if "A" in image.getbands():
                    background.paste(image, mask=image.getchannel("A"))
                else:
                    background.paste(image)
                image = background
            image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
            image.save(target, "WEBP", quality=76, method=6)
    total = sum(path.stat().st_size for path in OUTPUT.rglob("*.webp"))
    print({"count": len(images), "bytes": total})


if __name__ == "__main__":
    main()
