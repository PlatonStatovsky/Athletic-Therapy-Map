import asyncio, os
exec(open('run23.py').read().split('async def main')[0])
O = os.path.join(HERE, 'p4'); os.makedirs(O, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1000, 700), (390, 844)]:
            ctx, page = await ctx_page(b, w, h)
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.evaluate("insState().hypo = []; render()"); await page.wait_for_timeout(300)
            await page.screenshot(path=f'{O}/empty-{w}.png', full_page=True)
            await ctx.close()
        await b.close()
asyncio.run(main())
