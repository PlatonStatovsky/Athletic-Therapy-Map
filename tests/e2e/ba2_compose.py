import asyncio, base64
from playwright.async_api import async_playwright
D='ba2'
def uri(p): return 'data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
PAIRS=[
 ('date', 'תאריך המפגש בכותרת מסך הסיום (מפגש שהתחיל ב-23:40 והסתיים למחרת)', [('date', 1100)], 'column'),
 ('note', '"פתק" ← "שדה טקסט חופשי" (טלפון): שורת הכתיבה והרשימה', [('notebar', 360), ('notelist', 360)], 'row'),
 ('body', 'צבע ההקרנה במפת הגוף', [('body', 420)], 'row'),
 ('disclaim', 'ההבהרה בתחתית לוח ההשערות', [('disclaim', 1100)], 'column'),
]
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        for key,title,items,dirn in PAIRS:
            cols=''
            for v,label,color in (('before','לפני','#b42318'),('after','אחרי','#067647')):
                imgs=''.join(f'<img src="{uri(f"{D}/{v}-{n}.png")}" style="width:{w}px;border:1px solid #ccc;display:block;margin-bottom:10px">' for n,w in items)
                cols+=f'<div><div style="font-weight:700;color:{color};margin-bottom:6px">{label}</div>{imgs}</div>'
            html=f'<html dir="rtl"><body style="margin:0;background:#fff;font:15px Arial"><div id="c" style="display:inline-block;padding:16px 20px"><div style="font-weight:700;font-size:18px;margin-bottom:10px">{title}</div><div style="display:flex;gap:24px;align-items:flex-start;flex-direction:{dirn}">{cols}</div></div></body></html>'
            pg=await b.new_page(device_scale_factor=1.5); await pg.set_content(html); await pg.wait_for_timeout(300)
            await pg.locator('#c').screenshot(path=f'{D}/pair-{key}.png'); await pg.close()
        await b.close()
asyncio.run(main())
