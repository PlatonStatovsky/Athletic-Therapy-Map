import asyncio, os
exec(open('run23.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w, h in [(1280, 800), (390, 844)]:
            ctx, page = await ctx_page(b, w, h)
            await page.evaluate(SEED); await page.evaluate(EXAM); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500); await page.evaluate("render()"); await page.wait_for_timeout(300)
            await page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)"); await page.wait_for_timeout(300)
            r = await page.evaluate("""() => { const nb = $('#noteBar .notebar')?.getBoundingClientRect(), kids = [...$('#tabBody').children], last = kids[kids.length - 1].getBoundingClientRect(), tb = $('.tabbar')?.getBoundingClientRect();
              return { nbTop: nb && Math.round(nb.top), nbBottom: nb && Math.round(nb.bottom), lastBottom: Math.round(last.bottom), tabTop: tb && tb.height ? Math.round(tb.top) : null, vh: innerHeight, toolbarBg: getComputedStyle($('.toolbar')).backgroundColor, toolbarH: Math.round($('.toolbar').getBoundingClientRect().height) }; }""")
            print(w, r)
            await page.screenshot(path=f'{O}/11-bottom-{w}.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
