import asyncio, base64
from playwright.async_api import async_playwright
D = 'ba4'
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
B, A, N = ('לפני', '#b42318'), ('אחרי', '#067647'), ('המצב החדש', '#067647')
SETS = [
 ('threshold', 'לוח ההשערות כשבטופס יש רק תלונה, מיקום ופרט אחד (התחלה)', [(B, [('before-threshold.png', 340)]), (('אחרי: הלוח עוד לא מוצג', '#067647'), [])]),
 ('first', 'המודל החזיר 6 השערות: בלוח מוצגות 5', [(N, [('phone-1-first.png', 360)])]),
 ('changes', 'עדכון שני: הסדר נשמר, וכל שינוי מסומן', [(N, [('phone-2-changes.png', 360)])]),
 ('board', 'לוח ההשערות (אותו מפגש לדוגמה)', [(B, [('before-board.png', 340)]), (A, [('after-board.png', 340)])]),
 ('mine', 'הוספת השערה מהמפה, והשערה שהמטפל הוסיף', [(('רשימת המפה לאזור', '#067647'), [('phone-3-pick.png', 330)]), (('בלוח', '#067647'), [('phone-4-mine.png', 360)])]),
 ('flag', 'דגל אדום בטופס', [(N, [('phone-5-flag.png', 360)])]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, cols in SETS:
            h = ''
            for (label, color), imgs in cols:
                im = ''.join(f'<img src="{uri(f"{D}/{p}")}" style="width:{w}px;border:1px solid #ccc;display:block;margin-bottom:10px">' for p, w in imgs)
                h += f'<div><div style="font-weight:700;color:{color};margin-bottom:6px">{label}</div>{im}</div>'
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/pair-{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
