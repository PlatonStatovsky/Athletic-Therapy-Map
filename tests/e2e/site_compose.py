"""Before/after images for the Ligamentum log tab (run site_tour.py on both commits first)."""
import asyncio, base64, io, sys
from PIL import Image
from playwright.async_api import async_playwright
D = 'site'; PH = sys.argv[1] if len(sys.argv) > 1 else 'p0'
def uri(p, box=None, w=None):
    im = Image.open(f'{D}/{p}')
    if box: im = im.crop(box)
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
B, A = '#b42318', '#067647'
SETS = [
 (f'{PH}-map-comfort', 'מפת הדרך, נוח לעין (דסקטופ)', 560, [('לפני', B, 'before-map-d-comfort.png'), ('אחרי', A, 'after-map-d-comfort.png')]),
 (f'{PH}-map-dark', 'מפת הדרך, כהה (דסקטופ)', 560, [('לפני', B, 'before-map-d-dark.png'), ('אחרי', A, 'after-map-d-dark.png')]),
 (f'{PH}-map-light', 'מפת הדרך, בהיר (דסקטופ)', 560, [('לפני', B, 'before-map-d-light.png'), ('אחרי', A, 'after-map-d-light.png')]),
 (f'{PH}-phone', 'כרטיס מבדק בטלפון, נוח לעין', 300, [('לפני', B, 'before-map-p-comfort.png'), ('אחרי', A, 'after-map-p-comfort.png')]),
 (f'{PH}-home', 'דף הבית, נוח לעין', 560, [('לפני', B, 'before-home-comfort.png'), ('אחרי', A, 'after-home-comfort.png')]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, wd, cols in SETS:
            h = ''.join(f'<div style="max-width:{wd}px"><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(p)}" style="width:{wd}px;border:1px solid #ccc;display:block"></div>' for l, c, p in cols)
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
