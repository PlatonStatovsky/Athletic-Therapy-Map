"""Image for the SRS log: the recording limit (new state; run reclimit.py first)."""
import asyncio, base64, io
from PIL import Image
from playwright.async_api import async_playwright
D = 'reclimit'
def uri(p, box=None):
    im = Image.open(f'{D}/{p}')
    if box: im = im.crop(tuple(int(v) for v in box))
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
COLS = [('אחרי 10 הקלטות (או שעתיים): המיקרופון אפור', 'phone-full10.png', None, 300),
        ('5 הדקות האחרונות: השעון כתום', 'phone-warn.png', None, 300),
        ('הגדרות › תמלול: שורת מידע', 'tablet-settings.png', (1540, 0, 2480, 1300), 320)]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        h = ''.join(f'<div style="max-width:{w}px"><div style="font-weight:700;color:#067647;margin-bottom:6px">{l}</div><img src="{uri(p, bx)}" style="width:{w}px;border:1px solid #ccc;display:block"></div>' for l, p, bx, w in COLS)
        html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">הגבלת הקלטות במפגש: המצב החדש</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
        pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
        await pg.locator('#c').screenshot(path=f'{D}/new-state.png'); await b.close()
asyncio.run(main())
