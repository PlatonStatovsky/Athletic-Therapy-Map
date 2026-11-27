"""Before/after images for the SRS log: top bar, player, card rows, transcript panel, settings (run ui_tour.py on both commits first)."""
import asyncio, base64, io
from PIL import Image
from playwright.async_api import async_playwright
D = 'ui'
def uri(p, box=None):
    im = Image.open(f'{D}/{p}')
    if box: im = im.crop(tuple(int(v) for v in box))
    b = io.BytesIO(); im.save(b, 'PNG'); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()
B, A = '#b42318', '#067647'
def S(name, title, wd, cols): return (name, title, wd, cols)
SETS = [
 S('pair-phone', 'טלפון (390): השורה העליונה בזמן הקלטה, והנגן', 300, [('לפני', B, 'before-p390-comfort.png', None), ('אחרי', A, 'after-p390-comfort.png', None)]),
 S('pair-top', 'טלפון (412): השורה העליונה מקרוב', 420, [('לפני: גבהים שונים, השעה והטקסט נחתכים', B, 'before-p412-comfort-top.png', None), ('אחרי: שלוש קפסולות באותו גובה', A, 'after-p412-comfort-top.png', None)]),
 S('pair-desk', 'דסקטופ (1920): כרטיסי מפת גוף ומהלך הפציעה, והנגן', 560, [('לפני', B, 'before-d1920-comfort.png', None), ('אחרי: באותו גובה, ברוחב שווה; הנגן מעל שדה הטקסט', A, 'after-d1920-comfort.png', None)]),
 S('pair-finish', 'מסך הסיום (1440)', 520, [('לפני', B, 'before-d1440-comfort-finish.png', (0, 0, 2880, 1800)), ('אחרי', A, 'after-d1440-comfort-finish.png', (0, 0, 2880, 1800))]),
 S('pair-transcript', 'חלונית התמלול (1440)', 340, [('לפני: ▶ ופס רחב, שדה הקלדה ושורת מצב', B, 'before-d1440-comfort-transcript.png', None), ('אחרי: רק התמלול; ▶ קטן מתחת לטקסט', A, 'after-d1440-comfort-transcript.png', None)]),
 S('pair-settings', 'הגדרות › API', 340, [('לפני: בחירת מודל', B, 'before-settings-api.png', (1540, 0, 2480, 1720)), ('אחרי: אין בחירת מודל; נוסף "אבחון הקלטה"', A, 'after-settings-api.png', (1540, 0, 2480, 1720))]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, wd, cols in SETS:
            h = ''.join(f'<div style="max-width:{wd}px"><div style="font-weight:700;color:{c};margin-bottom:6px">{l}</div><img src="{uri(p, bx)}" style="width:{wd}px;border:1px solid #ccc;display:block"></div>' for l, c, p, bx in cols)
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
