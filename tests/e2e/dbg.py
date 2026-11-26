import asyncio
from playwright.async_api import async_playwright
exec(open('run20.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, page = await seeded(b, 1000, 625, 'comfort')
        await page.click('[data-act=island]'); await page.wait_for_timeout(600)
        print(await page.evaluate("[getComputedStyle(popEl).backdropFilter, getComputedStyle(popEl).webkitBackdropFilter, getComputedStyle(popEl).backgroundColor, getComputedStyle($('#island')).backdropFilter]"))
        await page.screenshot(path='u/dbg-pop.png', clip={'x':560,'y':380,'width':400,'height':150})
        await b.close()
asyncio.run(main())
