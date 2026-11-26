import asyncio
from playwright.async_api import async_playwright
exec(open('run20.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for dpr in [1, 2]:
            ctx = await b.new_context(viewport={'width':1000,'height':625}, device_scale_factor=dpr)
            page = await ctx.new_page(); await page.route('https://api.anthropic.com/**', anthropic)
            await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk-test', clientId:'cid', autoFill:false, kbVer:2, siteKB:true}));localStorage.setItem('uqmap-theme','comfort');")
            await page.goto(APP); await page.wait_for_timeout(300); await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.click('[data-act=island]'); await page.wait_for_timeout(600); await page.evaluate("popEl.style.background='rgba(255,255,255,.3)'")
            await page.screenshot(path=f'u/dbg-d{dpr}.png', clip={'x':373,'y':253,'width':267,'height':100}); await ctx.close()
        await b.close()
asyncio.run(main())
