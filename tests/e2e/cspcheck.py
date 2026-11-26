import asyncio, os, re
exec(open('run22.py').read().split('REGION_SEED =')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx, page = await ctx_page(b, 1000, 625)
        msgs = []; page.on('console', lambda m: msgs.append(m.text))
        await page.evaluate("const s = document.createElement('script'); s.textContent = 'window.__inl = 1'; document.body.appendChild(s); fetch('https://example.com/x').catch(() => {});")
        await page.wait_for_timeout(500)
        print('inline ran:', await page.evaluate("window.__inl || 0"), '| violations:', [m[:90] for m in msgs if 'Content Security Policy' in m])
        await b.close()
asyncio.run(main())
