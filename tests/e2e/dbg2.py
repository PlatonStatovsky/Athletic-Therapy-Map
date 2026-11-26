import asyncio
from playwright.async_api import async_playwright
exec(open('run20.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx, page = await seeded(b, 1000, 625, 'comfort')
        await page.click('[data-act=island]'); await page.wait_for_timeout(600)
        clip = {'x':560,'y':380,'width':400,'height':150}
        tries = [("none", ""), ("noanim", "popEl.style.animation='none'"), ("bg", "popEl.style.background='rgba(255,255,255,.3)'"),
                 ("dpr", "1")]
        for name, js in tries[:3]:
            if js: await page.evaluate(js); await page.wait_for_timeout(200)
            await page.screenshot(path=f'u/dbg-{name}.png', clip=clip)
        # find ancestors of #app with properties that create a backdrop root
        print(await page.evaluate("""(() => { const out=[]; for (const el of [document.documentElement, document.body, $('#app'), $('.shell'), $('.main'), $('#tabBody')]) { const c=getComputedStyle(el); out.push([el.tagName+'.'+el.className, c.filter, c.opacity, c.backdropFilter, c.willChange, c.mixBlendMode, c.isolation, c.contain]); } return out; })()"""))
        await b.close()
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':1000,'height':625}, device_scale_factor=1)
        page = await ctx.new_page(); await page.route('https://api.anthropic.com/**', anthropic)
        await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk-test', clientId:'cid', autoFill:false, kbVer:2, siteKB:true}));localStorage.setItem('uqmap-theme','comfort');")
        await page.goto(APP); await page.wait_for_timeout(300); await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.click('[data-act=island]'); await page.wait_for_timeout(600); await page.evaluate("popEl.style.background='rgba(255,255,255,.3)'")
        await page.screenshot(path='u/dbg-dpr1.png', clip={'x':373,'y':253,'width':267,'height':100})
        await b.close()
asyncio.run(main())
