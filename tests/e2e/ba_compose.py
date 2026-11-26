import asyncio, base64, os
from playwright.async_api import async_playwright
D = 'ba'
PAIRS = [
 ('1-empty', 'מפגש ריק → "סיום"', 'נפתח מסך הסיום', 'נשארים במפגש, עם הודעה מה חסר', 360),
 ('2-top', 'ראש מסך הסיום (טאבלט)', 'אין נגן; הכרטיסים בגבהים שונים', 'נגן לכל ההקלטה; הכרטיסים באותו גובה', 1000),
 ('3-rows', 'שורות "לאימות" (טלפון)', 'תיבת טקסט לעריכה, "אשר" ו"נקה"', 'קריאה בלבד: ▶, "אשר", "ערוך" למסך המפגש', 360),
 ('4-popover', 'חלון "לאמת" בכרטיס (טאבלט)', 'יש "בטל מילוי"; "ערוך" לא עבד', 'בלי "בטל מילוי"; "ערוך" עובר למסך המפגש', 1000),
]
def uri(p): return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for key, title, bef, aft, w in PAIRS:
            html = f'''<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial">
<div id="c" style="display:inline-block;padding:16px 20px">
<div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div>
<div style="display:flex;gap:24px;align-items:flex-start;flex-direction:{'column' if w>500 else 'row'}">
 <div style="width:{w}px"><div style="font-weight:700;color:#b42318;margin-bottom:2px">לפני</div><div style="color:#444;margin-bottom:6px;min-height:20px">{bef}</div><img src="{uri(f"{D}/before-{key}.png")}" style="width:100%;border:1px solid #ccc"></div>
 <div style="width:{w}px"><div style="font-weight:700;color:#067647;margin-bottom:2px">אחרי</div><div style="color:#444;margin-bottom:6px;min-height:20px">{aft}</div><img src="{uri(f"{D}/after-{key}.png")}" style="width:100%;border:1px solid #ccc"></div>
</div></div></body></html>'''
            pg = await b.new_page(device_scale_factor=2); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/pair-{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
