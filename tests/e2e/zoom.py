import asyncio, os
os.environ['DPR'] = '1'
exec(open('run23.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1000, 'height': 900}, locale='he-IL', device_scale_factor=3)
        ctx, page = await ctx_page(b, 1000, 900, ctx=ctx)
        await page.evaluate(SEED); await page.evaluate(EXAM); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1600); await page.evaluate("render()"); await page.wait_for_timeout(400)
        el = await page.query_selector('.bar-g'); await el.scroll_into_view_if_needed(); await el.screenshot(path=f'{O}/z-bar.png')
        el = await page.query_selector('.dot-r'); await el.screenshot(path=f'{O}/z-dot.png')
        await b.close()
asyncio.run(main())
