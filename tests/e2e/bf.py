import asyncio
from playwright.async_api import async_playwright
H = """<body style="margin:0;font:30px sans-serif"><p>Text behind the glass panel to test blur</p><p>Second line of crisp text here</p>
<div id=a style="position:fixed;top:0;left:0;width:300px;height:120px;background:rgba(255,255,255,.3);backdrop-filter:blur(12px)"></div>
<div id=b style="position:fixed;top:0;left:320px;width:300px;height:120px;overflow:auto;background:rgba(255,255,255,.3);backdrop-filter:blur(12px)"></div></body>"""
async def main():
    async with async_playwright() as p:
        for args in [[], ['--enable-gpu-rasterization']]:
            b = await p.chromium.launch(args=args); pg = await b.new_page(viewport={'width':700,'height':140}, device_scale_factor=(1.5 if not args else 2))
            await pg.set_content(H); await pg.wait_for_timeout(300); await pg.screenshot(path=f'u/bf{len(args)}.png'); await b.close()
asyncio.run(main())
