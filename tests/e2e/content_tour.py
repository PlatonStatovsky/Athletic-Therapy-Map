"""Redesign phase 2 (content components): step cards, decision blocks, red-flag checks, patterns and paths, tables, the tests panel card.
Desktop 1440 and phone 384, opens one check and one path. TAG=before BASE=... for an old commit; THEMES=light,comfort,dark."""
import asyncio, os
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766'); TAG = os.environ.get('TAG', 'after')
THEMES = os.environ.get('THEMES', 'comfort').split(',')
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content'); os.makedirs(O, exist_ok=True)
async def run(b, theme, name, w, h, path, js=None, scroll_to=None):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=w < 600, has_touch=w < 600)
    await ctx.add_init_script(f"try{{localStorage.setItem('uqmap-theme','{theme}')}}catch(e){{}}")
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:140]))
    await pg.goto(BASE + path); await pg.wait_for_timeout(1200)
    if js: await pg.evaluate(js); await pg.wait_for_timeout(500)
    if scroll_to:
        await pg.evaluate(f"(() => {{ const e = document.querySelector({scroll_to!r}); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 90); }})()")
        await pg.wait_for_timeout(400)
    ov = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    await pg.screenshot(path=f'{O}/{TAG}-{name}-{theme}.png')
    print(TAG, name, theme, 'overflow', ov, '| errors:', errs); await ctx.close()
OPEN = "document.querySelectorAll('section:not([hidden]) details.chk')[0]?.setAttribute('open',''); document.querySelector('section:not([hidden]) .path > button.ph')?.click()"
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for th in THEMES:
            await run(b, th, 'desk-general', 1440, 900, '/map/#general', OPEN, 'section:not([hidden]) .dec')
            await run(b, th, 'desk-knee-paths', 1440, 900, '/map/#knee', OPEN, 'section:not([hidden]) .pats')
            await run(b, th, 'phone-general', 384, 840, '/map/#general', OPEN, 'section:not([hidden]) .dec')
            await run(b, th, 'phone-knee', 384, 840, '/map/#knee')
            await run(b, th, 'phone-knee-checks', 384, 840, '/map/#knee', OPEN, 'section:not([hidden]) .checks')
            await run(b, th, 'phone-knee-paths', 384, 840, '/map/#knee', OPEN, 'section:not([hidden]) .path.open')
            await run(b, th, 'phone-card', 384, 840, '/map/#knee&t=lachman')
        await b.close()
asyncio.run(main())
