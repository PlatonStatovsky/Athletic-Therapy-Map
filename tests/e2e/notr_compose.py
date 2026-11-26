"""Before/after images for the SRS log: no transcript in a session without recording (run norec_tr.py on both commits first)."""
import asyncio, base64, io
from PIL import Image
from playwright.async_api import async_playwright
D = 'notr'
def uri(p, crop=None):
    im = Image.open(f'{D}/{p}')
    if crop: im = im.crop((0, 0, im.width, min(im.height, crop)))
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
B, A = '#b42318', '#067647'
SETS = [
 ('pair-tablet', 'מפגש ללא הקלטה, טאבלט', 480, [('לפני: חלונית "תמלול" בצד', B, 'before-tablet-norec.png', None), ('אחרי: אין חלונית; המפגש ברוחב מלא', A, 'after-tablet-norec.png', None)]),
 ('pair-phone', 'מפגש ללא הקלטה, טלפון', 300, [('לפני: כפתור תמלול 💬 בראש המסך', B, 'before-phone-norec.png', 700), ('אחרי: אין כפתור תמלול', A, 'after-phone-norec.png', 700)]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, wd, cols in SETS:
            h = ''.join(f'<div><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(p, cr)}" style="width:{wd}px;border:1px solid #ccc;display:block"></div>' for l, c, p, cr in cols)
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
