import asyncio
from playwright.async_api import async_playwright
exec(open('run10.py').read().split('async def main')[0])
src = open('run14.py').read(); a = src.index('async def ctxpage'); b = src.index('async def main():'); exec(src[a:b])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in ['comfort', 'light', 'dark']:
            ctx, page = await ctxpage(b, 390, 844, theme)
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            print(theme, 'phone title:', await page.evaluate("[getComputedStyle($('.top .bmini b')).display, $('.tt h1').offsetWidth, $('.tt h1').scrollWidth]"))
            await page.screenshot(path=f'/home/claude/athletic-therapy-map/.impeccable/review/mobile-{theme}-top.png')
            await ctx.close()
        ctx, page = await ctxpage(b, 1000, 625, 'comfort')
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.click('#feed [data-act=confirm] >> nth=1'); await page.wait_for_timeout(300)
        print('confirmed badge:', await page.evaluate("$$('#feed .badge.ok').length"))
        await page.screenshot(path='/home/claude/athletic-therapy-map/.impeccable/review/user-1000-confirmed.png')
        await ctx.close(); await b.close()
asyncio.run(main())
