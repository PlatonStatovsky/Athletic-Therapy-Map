"""Before/after images for the SRS log: threshold hint and the no-recording transcript label (run hint_norec.py on both commits first)."""
import asyncio, base64, io
from PIL import Image
from playwright.async_api import async_playwright
D = 'hint'
def uri(p, crop=None):
    im = Image.open(f'{D}/{p}')
    if crop: im = im.crop((0, 0, im.width, min(im.height, crop)))
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
B, A = '#b42318', '#067647'
SETS = [
 ('pair-hint', 'לוח השערות לפני הסף, במפגש מעקב (חסרים פיזור ועוד פרט)', [('לפני: רק התחלה, מנגנון, מחמיר או ממצא בבדיקה', B, 'before-phone-followup.png', None), ('אחרי: כל השדות שנספרים', A, 'after-phone-followup.png', None)]),
 ('pair-norec', 'לשונית התמלול במפגש ללא הקלטה', [('לפני: "הכתבה במקלדת, או הדבקת תמלול"', B, 'before-tablet-norec.png', 760), ('אחרי: "הקלדת טקסט חופשי (מפגש ללא הקלטה)"', A, 'after-tablet-norec.png', 760)]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, cols in SETS:
            h = ''.join(f'<div><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(p, cr)}" style="width:360px;border:1px solid #ccc;display:block"></div>' for l, c, p, cr in cols)
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
