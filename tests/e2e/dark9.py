import asyncio, os
exec(open('run23.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, page = await ctx_page(b, 1280, 800, theme='light')
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.click('[data-act=more]'); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{O}/9-more.png')
        print(await page.evaluate("$$('.pop [data-theme], .pop button').map(b => b.textContent.trim() + '|' + (b.dataset.theme||b.dataset.act||''))"))
        await page.evaluate("setTheme('dark')"); await page.wait_for_timeout(400)
        print('panel bg:', await page.evaluate("getComputedStyle($('.insp-in')).backgroundColor"), await page.evaluate("getComputedStyle($('.insp-h')).backgroundColor"), await page.evaluate("getComputedStyle($('#segList .seg')).backgroundColor"))
        await page.keyboard.press('Escape'); await page.wait_for_timeout(200)
        await page.screenshot(path=f'{O}/9-dark.png')
        await b.close()
asyncio.run(main())
