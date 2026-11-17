"""Build the portable HTML from the game sources and local media assets."""

from base64 import b64encode
import json
from mimetypes import guess_type
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent


def embed(name):
    path = ROOT / name
    mime = guess_type(path.name)[0] or "application/octet-stream"
    return "data:" + mime + ";base64," + b64encode(path.read_bytes()).decode("ascii")


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Expected a single occurrence of {old!r}")
    return text.replace(old, new, 1)


def build():
    page = (ROOT / "index.html").read_text(encoding="utf-8-sig")
    css = (ROOT / "style.css").read_text(encoding="utf-8-sig")
    css = re.sub(r'url\("(assets/[^"]+)"\)', lambda m: 'url("' + embed(m[1]) + '")', css)
    page = replace_once(page, '<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
    page = re.sub(r'src="(assets/[^"]+)"', lambda m: 'src="' + embed(m[1]) + '"', page)
    scripts = []
    for tag in re.finditer(r'<script defer src="([^"]+)"></script>', page):
        name = tag[1]
        source = (ROOT / name).read_text(encoding="utf-8-sig")
        if name == "pieces.js":
            photos = {p.stem: embed(p.relative_to(ROOT)) for p in sorted((ROOT / "assets").glob("*.jpg"))}
            source = replace_once(source, "const base = document.currentScript?.src || document.baseURI;",
                                  "const photos = " + json.dumps(photos, separators=(",", ":")) + ";")
            source = replace_once(source, "new URL('assets/' + file + '.jpg', base).href", "photos[file]")
        scripts.append("<script>\n" + source + "\n</script>")
        page = replace_once(page, tag[0], "")
    page = replace_once(page, "</body>", "\n".join(scripts) + "\n</body>")
    (ROOT / "sukima-suika.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
