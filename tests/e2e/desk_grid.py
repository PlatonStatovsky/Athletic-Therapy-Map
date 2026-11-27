"""Ligamentum map on desktop (2000/1440/1280/1200): header aligned with the columns (brand over regions, search over content, tools over tests), equal side columns, tools fit, scroll cues (fade, steps hint). Prints edges in px and page errors."""
import asyncio, os
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766')
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w,h in ((2000,1100),(1440,900),(1280,800),(1200,800)):
            ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=1)
            pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
            await pg.goto(BASE + '/map/#general'); await pg.wait_for_timeout(1200)
            r = await pg.evaluate("""(() => { const R = s => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right)]; };
              const tools = document.querySelector('.tools'); 
              return { side: R('#side'), panel: R('#panel'), mainin: R('.main-in'), search: R('.search'), tools: R('.tools'), brand: R('.brand'),
                toolsOverflow: tools.scrollWidth - tools.clientWidth, hint: !document.querySelector('#railMore').hidden,
                sideFade: document.querySelector('#side').classList.contains('more-below'), panelFade: document.querySelector('#panel').classList.contains('more-below') }; })()""")
            print(w, r, errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
