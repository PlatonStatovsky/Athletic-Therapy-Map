"""Redesign phase 1 (frame): the map's header, region rail, tests panel and phone bar with its sheets, phone / tablet / desktop.
TAG=before BASE=... for an old commit. THEMES=light,comfort,dark. Prints layout facts and page errors."""
import asyncio, os
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766'); TAG = os.environ.get('TAG', 'after')
THEMES = os.environ.get('THEMES', 'comfort').split(',')
HERE = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(HERE, 'frame'); os.makedirs(O, exist_ok=True)
async def shot(b, theme, name, w, h, path, steps=()):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2)
    await ctx.add_init_script(f"try{{localStorage.setItem('uqmap-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:140]))
    await pg.goto(BASE + path); await pg.wait_for_timeout(1300)
    for s in steps:
        if s.startswith('click:'):
            loc = pg.locator(s[6:]).first
            if await loc.count() and await loc.is_visible(): await loc.click()
            else: errs.append('not visible: ' + s[6:])
        elif s.startswith('scroll:'): await pg.evaluate(f"window.scrollTo(0,{s[7:]})")
        await pg.wait_for_timeout(600)
    facts = await pg.evaluate("""(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height), cs.visibility[0]]; };
      return { field: r('.field'), tools: r('.tools'), side: r('#side'), panel: r('#panel'), mbar: r('#mbar'), disp: r('#disp'), sel: document.querySelector('.reg[aria-selected=true]')?.textContent.trim().slice(0,12), scrim: !document.querySelector('#scrim').hidden }; })()""")
    await pg.screenshot(path=f'{O}/{TAG}-{name}-{theme}.png')
    print(TAG, name, theme, facts, '| errors:', errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for th in THEMES:
            await shot(b, th, 'desk', 1440, 900, '/map/#knee')
            await shot(b, th, 'desk-scrolled', 1440, 900, '/map/#knee', ['scroll:700'])
            await shot(b, th, 'tablet', 1024, 768, '/map/#knee')
            await shot(b, th, 'tablet-tests', 1024, 768, '/map/#knee', ['click:#testsBtn'])
            await shot(b, th, 'phone', 390, 844, '/map/#knee')
            await shot(b, th, 'phone-regions', 390, 844, '/map/#knee', ['click:[data-mbar=regions]'])
            await shot(b, th, 'phone-tests', 390, 844, '/map/#knee', ['click:[data-mbar=tests]'])
            await shot(b, th, 'phone-disp', 390, 844, '/map/#knee', ['click:[data-mbar=disp]'])
            await shot(b, th, 'phone-switch', 390, 844, '/map/#knee', ['click:[data-mbar=regions]', 'click:#side [data-tab=shoulder]'])
            await shot(b, th, 'phone-card', 390, 844, '/map/#knee&t=lachman')
        await b.close()
asyncio.run(main())
