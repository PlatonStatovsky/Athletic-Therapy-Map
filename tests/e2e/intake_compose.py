"""Before/after images for the SRS log: patient details on the start screen (run intake.py on both commits first)."""
import asyncio, base64, io
from PIL import Image
from playwright.async_api import async_playwright
D = 'intake'
def uri(p, crop=None):
    im = Image.open(f'{D}/{p}')
    if crop: im = im.crop((0, 0, im.width, min(im.height, crop)))
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
B, A, N = '#b42318', '#067647', '#067647'
SETS = [
 ('pair-start', 'מסך "מפגש חדש" (טלפון)', 300, [('לפני: שם, אזור, סוג', B, 'before-phone-start.png', None), ('אחרי: "פרטי מטופל (לא חובה)", פתוח', A, 'after-phone-start.png', None)]),
 ('pair-form', 'הטופס › אנמנזה (טלפון)', 300, [('לפני: 8 שדות בפרטים אישיים', B, 'before-phone-form.png', 1000), ('אחרי: רק השם; יד/רגל דומיננטית וגורם מפנה בסוף "תלונה עיקרית"', A, 'after-phone-form.png', 2000)]),
 ('new-popup', 'לחיצה על שם המטופל במסך המפגש', 320, [('המצב החדש: עריכת פרטי המטופל', N, 'after-phone-popup.png', 1350)]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, wd, cols in SETS:
            h = ''.join(f'<div style="max-width:{wd}px"><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(p, cr)}" style="width:{wd}px;border:1px solid #ccc;display:block"></div>' for l, c, p, cr in cols)
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
