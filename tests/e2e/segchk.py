import asyncio, os
os.environ['DPR'] = '1'
from playwright.async_api import async_playwright
exec(open('run20.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, page = await seeded(b, 1000, 625, 'comfort')
        print(await page.evaluate("[getComputedStyle($('#stageChips')).padding, getComputedStyle($('#stageChips')).borderRadius, getComputedStyle($('#segList .seg')).borderRadius, getComputedStyle($('#segList .seg')).maxWidth]"))
        await page.screenshot(path='/home/claude/athletic-therapy-map/.impeccable/review/user-1000.png')
        await page.evaluate("openSettings('display')"); await page.wait_for_timeout(500); await page.screenshot(path='/home/claude/athletic-therapy-map/.impeccable/review/user-1000-settings-display.png')
        print(page._errs); await b.close()
asyncio.run(main())
