import asyncio
from playwright.async_api import async_playwright
H = """<body style="margin:0;font:30px sans-serif;background:#eee"><p>Text behind the glass panel to test blur</p><p>Second line of crisp text here</p>
<div style="position:fixed;top:0;left:0;width:300px;height:120px;background:rgba(255,255,255,.3);backdrop-filter:blur(12px)"></div></body>"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w,h,d in [(700,140,2),(1000,625,1),(1000,625,1.5),(1000,625,2)]:
            pg = await b.new_page(viewport={'width':w,'height':h}, device_scale_factor=d); await pg.set_content(H); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'u/bf-{w}-{d}.png', clip={'x':0,'y':0,'width':400,'height':120}); await pg.close()
        await b.close()
asyncio.run(main())
