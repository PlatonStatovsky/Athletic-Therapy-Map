import asyncio, base64
from playwright.async_api import async_playwright
D = 'ba3'
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
B, A, N = ('לפני', '#b42318'), ('אחרי', '#067647'), ('המצב החדש', '#067647')
# key, title, direction, [ (label, color, [(path, width)]) ]
SETS = [
 ('locked', 'רשומה נעולה במסך רחב (טאבלט לרוחב)', 'row', [(B, [('before-locked.png', 560)]), (A, [('after-locked.png', 560)])]),
 ('dlg', 'מפגש חדש כשהמפגש הפתוח נשמר ושונה אחרי השמירה', 'row', [(N, [('after-dlg.png', 300)])]),
 ('regions', 'רשימת האזורים בפתיחת מפגש', 'row', [(B, [('before-regions.png', 300)]), (A, [('after-regions.png', 300)])]),
 ('norec1', 'פתיחת מפגש בלי סימון הסכמה, והאי בראש מסך המפגש', 'row', [(N, [('new-norec-popup.png', 330)]), (('האי בטלפון ובטאבלט', '#067647'), [('new-norec-island-phone.png', 390), ('new-norec-island-tablet.png', 560)])]),
 ('norec2', 'מסך "סיום מפגש": עם הקלטה וללא הקלטה', 'row', [(('מפגש עם הקלטה', '#1d4ed8'), [('after-fintop.png', 560)]), (('מפגש ללא הקלטה', '#067647'), [('new-norec-fintop.png', 560), ('new-norec-consent.png', 560)])]),
 ('ver1', 'מסך "סיום מפגש": מפת גוף ומהלך הפציעה', 'row', [(B, [('before-cards-top.png', 520)]), (A, [('after-cards-top.png', 520)])]),
 ('ver2', 'שורת השמירה, ואחרי האימות', 'row', [(B, [('before-saverow.png', 520)]), (A, [('after-saverow.png', 520), ('verified-crop.png', 520)])]),
 ('root', 'הכתובת הראשית של האתר (ligamentum.pages.dev)', 'row', [(B, [('before-root.png', 560)]), (A, [('after-root.png', 560)])]),
]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, dirn, cols in SETS:
            h = ''
            for (label, color), imgs in cols:
                im = ''.join(f'<img src="{uri(f"{D}/{p}")}" style="width:{w}px;border:1px solid #ccc;display:block;margin-bottom:10px">' for p, w in imgs)
                h += f'<div><div style="font-weight:700;color:{color};margin-bottom:6px">{label}</div>{im}</div>'
            html = f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start;flex-direction:{dirn}">{h}</div></div></body></html>'
            pg = await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/pair-{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
