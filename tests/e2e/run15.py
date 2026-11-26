import asyncio, os
from playwright.async_api import async_playwright
exec(open('run10.py').read().split('async def main')[0])
src = open('run14.py').read(); a = src.index('async def ctxpage'); b = src.index('async def main():')
exec(src[a:b])
R = '/home/claude/athletic-therapy-map/.impeccable/review'; os.makedirs(R, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (w, h, name, full) in [(1440, 900, 'desktop', True), (390, 844, 'mobile', True), (1000, 625, 'user-1000', False)]:
            ctx, page = await ctxpage(b, w, h, 'comfort')
            await page.evaluate(SEED); await page.wait_for_timeout(400)
            await page.screenshot(path=f'{R}/{name}.png', full_page=full)
            if name == 'user-1000':
                await page.click('[data-act=finish]'); await page.wait_for_timeout(400)
                await page.screenshot(path=f'{R}/user-1000-finish.png', full_page=True)
                await page.goto(APP); await page.wait_for_timeout(300)
                await page.evaluate("view='home'; render()"); await page.wait_for_timeout(200)
                await page.screenshot(path=f'{R}/user-1000-home.png')
            await ctx.close()
        for theme in ['light', 'dark']:
            ctx, page = await ctxpage(b, 1000, 625, theme)
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.screenshot(path=f'{R}/user-1000-{theme}.png'); await ctx.close()
        await b.close()
asyncio.run(main())
