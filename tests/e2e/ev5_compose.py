"""Before/after image for the SRS log: 0–5 supporting / contradicting facts (run ev5.py on both commits first)."""
import asyncio, base64
from playwright.async_api import async_playwright
D = 'ev5'
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
COLS = [(('לפני: 8 עובדות תומכות, "—" בסותר', '#b42318'), 'before-phone.png'), (('אחרי: 5 החזקות, "אין ממצאים סותרים"', '#067647'), 'after-phone.png')]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        h = ''.join(f'<div><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(f"{D}/{p}")}" style="width:340px;border:1px solid #ccc;display:block"></div>' for (l, c), p in COLS)
        html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">לוח השערות: המודל החזיר 8 עובדות תומכות ואף לא אחת סותרת</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
        pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
        await pg.locator('#c').screenshot(path=f'{D}/pair.png'); await b.close()
asyncio.run(main())
