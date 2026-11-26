import asyncio, os
exec(open('run23.py').read().split('async def main')[0])
O = os.path.join(HERE, 'p4'); os.makedirs(O, exist_ok=True)
MEASURE = """() => $$('svg text').filter(t => t.getBoundingClientRect().width).map(t => { const svg = t.ownerSVGElement, vb = svg.viewBox.baseVal, sc = vb && vb.width ? svg.getBoundingClientRect().width / vb.width : 1;
  return [(svg.closest('.tl') ? 'course' : svg.closest('.bm') ? 'body' : svg.closest('.dot-r') ? 'mmt' : 'other'), +(parseFloat(getComputedStyle(t).fontSize) * sc).toFixed(1)]; })
  .reduce((m, [k, v]) => (m[k] = Math.min(m[k] ?? 99, v), m), {})"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for w, h in [(390, 844), (1000, 625), (1440, 900)]:
            ctx, page = await ctx_page(b, w, h)
            await page.evaluate(SEED); await page.evaluate(EXAM); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500); await page.evaluate("render()"); await page.wait_for_timeout(400)
            print(w, 'smallest rendered chart text px:', await page.evaluate(MEASURE))
            print('  nav aria-current:', await page.evaluate("$$('.nav-i[aria-current]').map(b => b.dataset.tab)"), '| h2 wraps:', await page.evaluate("$$('.card-h h2').filter(h => h.getClientRects().length > 1 || h.scrollWidth > h.clientWidth + 1).map(h => h.textContent)"))
            errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
