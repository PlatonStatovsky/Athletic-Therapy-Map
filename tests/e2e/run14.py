"""Thalamus look: live/finish in three themes; focus, pane widths, density; leader line; home; settings."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
exec(open('run10.py').read().split('async def main')[0])
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 't'); os.makedirs(OUT, exist_ok=True)
async def ctxpage(b, w, h, theme, extra=''):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=1.5)
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    for pat in ['https://fonts.googleapis.com/**', 'https://accounts.google.com/**']:
        await page.route(pat, lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
    await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'soniox', accessCode:'x'" + extra + "}));" + f"localStorage.setItem('uqmap-theme','{theme}');")
    await page.goto(APP); await page.wait_for_timeout(300)
    return ctx, page
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in ['comfort', 'light', 'dark']:
            ctx, page = await ctxpage(b, 1000, 625, theme)
            await page.screenshot(path=f'{OUT}/{theme}-home.png')
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.screenshot(path=f'{OUT}/{theme}-tablet-live.png')
            if theme == 'comfort':
                await page.click('#feed [data-act=src] >> nth=1'); await page.wait_for_timeout(300)
                print('leader:', await page.evaluate("[!!$('#leader'), $$('.seg.sourced').map(e=>e.dataset.i)]"))
                await page.screenshot(path=f'{OUT}/comfort-tablet-leader.png')
                for k in ['narrow', 'wide', 'hidden']:
                    await page.evaluate(f"settings.sideW='{k}'; saveSettings(); render();"); await page.wait_for_timeout(200)
                    print('pane', k, await page.evaluate("[document.documentElement.hasAttribute('data-side-on'), !!$('#sidePane'), $('#sidePane')?.offsetWidth || 0, getComputedStyle($('#tabs [data-tab=transcript]')).display]"))
                    await page.screenshot(path=f'{OUT}/comfort-tablet-pane-{k}.png')
                await page.evaluate("settings.sideW='medium'; saveSettings(); render();")
                await page.click('[data-act=focus]'); await page.wait_for_timeout(300)
                print('focus:', await page.evaluate("[document.documentElement.hasAttribute('data-focus'), !!$('#sidePane'), !!$('.captured')?.offsetParent]"))
                await page.screenshot(path=f'{OUT}/comfort-tablet-focus.png')
                await page.click('[data-act=focus]'); await page.wait_for_timeout(200)
                await page.evaluate("settings.density='compact'; saveSettings(); render();"); await page.wait_for_timeout(200)
                await page.screenshot(path=f'{OUT}/comfort-tablet-compact.png')
                await page.evaluate("settings.density='comfortable'; saveSettings(); render();")
                await page.click('[data-act=finish]'); await page.wait_for_timeout(400)
                await page.screenshot(path=f'{OUT}/comfort-tablet-finish.png')
                await page.click('[data-act=resume] >> nth=0'); await page.wait_for_timeout(200)
                await page.click('[data-act=settings]'); await page.wait_for_timeout(300)
                await page.locator('[data-act=sideW]').first.scroll_into_view_if_needed()
                await page.screenshot(path=f'{OUT}/comfort-settings.png')
            print(theme, 'errors', page._errs); await ctx.close()
            ctx, page = await ctxpage(b, 390, 844, theme)
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.screenshot(path=f'{OUT}/{theme}-phone-live.png')
            if theme == 'comfort':
                await page.click('#feed [data-act=src] >> nth=0'); await page.wait_for_timeout(200)
                print('phone callout:', await page.evaluate("$('.callout')?.textContent"))
            await ctx.close()
        await b.close()
asyncio.run(main())
