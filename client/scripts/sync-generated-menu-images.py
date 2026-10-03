"""Copy generated assets/{slug}.jpg into manifest dest paths."""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = Path(r"C:/Users/abc03/.cursor/projects/d-Freelance-Gangaram-Sweets/assets")
MANIFEST = Path(__file__).resolve().parent / "menu-image-manifest.json"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    copied = 0
    for entry in manifest:
        src = ASSETS / f"{entry['slug']}.jpg"
        dest = ROOT / entry["dest"]
        if src.is_file() and not dest.is_file():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied += 1
    print(f"Copied {copied} new item images")


if __name__ == "__main__":
    main()
