# Build the site: src/*.js + template.html -> src/upper-quadrant-map.html (build.js) -> ../index.html (this script).
# Run from the repo root:  node src/build.js && python3 src/build-site.py
import pathlib
here = pathlib.Path(__file__).resolve().parent
src = (here / "upper-quadrant-map.html").read_text(encoding="utf-8")
i = src.index("</style>") + len("</style>")
head, body = src[:i], src[i:]
head = head.replace('<title>שיקום שמרני מפת דרך</title>\n', '', 1).replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '', 1)
out = ('<!doctype html>\n<html lang="he" dir="rtl">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
       '<meta name="description" content="שיקום שמרני מפת דרך — צוואר, כתף, מרפק, שורש כף היד וכף היד">\n'
       '<title>שיקום שמרני מפת דרך</title>\n' + head + '\n</head>\n<body>' + body.rstrip() + '\n</body>\n</html>\n')
(here.parent / "index.html").write_text(out, encoding="utf-8")
print("ok", len(out))
