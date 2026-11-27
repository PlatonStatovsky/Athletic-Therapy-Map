"""Ligamentum redesign: screenshots of the home page, the map (desktop region, phone test card) and Thalamus,
in light / comfort / dark. BASE=http://127.0.0.1:8767 TAG=before for the old commit. Prints page errors and missing fonts."""
import asyncio, os
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766'); TAG = os.environ.get('TAG', 'after')
HERE = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(HERE, 'site'); os.makedirs(O, exist_ok=True)
PAGES = [('home', '/', 1440, 900), ('map-d', '/map/#knee', 1440, 900), ('map-p', '/map/#knee&t=lachman', 390, 844), ('app', '/app/', 1240, 860)]
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for theme in ('light', 'comfort', 'dark'):
            for name, path, w, h in PAGES:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
                await ctx.add_init_script(f"try{{localStorage.setItem('uqmap-theme','{theme}')}}catch(e){{}}")
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
                pg.on('requestfailed', lambda r: errs.append('failed ' + r.url[-60:]))
                await pg.goto(BASE + path); await pg.wait_for_timeout(1600)
                font = await pg.evaluate("document.fonts.check('16px ThalamusSans', 'שלום') + ' ' + getComputedStyle(document.body).fontFamily.slice(0,40)")
                await pg.screenshot(path=f'{O}/{TAG}-{name}-{theme}.png')
                print(TAG, name, theme, '| font:', font, '| errors:', errs)
                await ctx.close()
        await b.close()
asyncio.run(main())
