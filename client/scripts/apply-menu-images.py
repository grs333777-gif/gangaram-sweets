"""Attach /images/menu/{category}/{slug}.jpg paths in menu.json when files exist."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MENU_PATH = ROOT / "src/data/menu.json"


def slugify(name: str) -> str:
    return re.sub(
        r"(^-|-$)",
        "",
        re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", " and ")),
    )


def main() -> None:
    menu = json.loads(MENU_PATH.read_text(encoding="utf-8"))
    linked = 0
    for cat in menu["categories"]:
        cid = cat["id"]
        cat_dir = ROOT / "public/images/menu" / cid
        category_file = cat_dir / f"{cid}-category.jpg"
        if category_file.is_file():
            cat["image"] = f"/images/menu/{cid}/{cid}-category.jpg"
        for item in cat["items"]:
            slug = slugify(item["name"])
            item_file = cat_dir / f"{slug}.jpg"
            if item_file.is_file():
                item["image"] = f"/images/menu/{cid}/{slug}.jpg"
                linked += 1
    MENU_PATH.write_text(json.dumps(menu, indent=2) + "\n", encoding="utf-8")
    print(f"Linked {linked} item images in {MENU_PATH}")


if __name__ == "__main__":
    main()
