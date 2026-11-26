import asyncio, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'home'); os.makedirs(O, exist_ok=True)
BASE = 'http://localhost:8766/'
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w, h, tag in [(390, 844, 'phone'), (1240, 860, 'tablet')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, locale='he-IL'); page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto(BASE); await page.wait_for_timeout(800)
            p(tag, 'home links:', await page.evaluate("[...document.querySelectorAll('a')].map(a => a.getAttribute('href') + ' → ' + a.href)"), '| theme =', await page.evaluate("document.documentElement.dataset.theme"))
            await page.screenshot(path=f'{O}/{tag}-home.png')
            await page.click('#theme'); p('after theme click:', await page.evaluate("document.documentElement.dataset.theme + ' ' + localStorage.getItem('uqmap-theme')"))
            await page.screenshot(path=f'{O}/{tag}-home-2.png')
            await page.click('#theme'); await page.click('#theme')
            for old in ['#knee', '#shoulder&t=hk', '']:
                pg = await ctx.new_page(); await pg.goto(BASE + old); await pg.wait_for_timeout(900)
                p(f'  {BASE + old} → {pg.url}'); await pg.close()
            await page.goto(BASE); await page.wait_for_timeout(300)
            await page.close(); page = await ctx.new_page(); page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto(BASE + '#shoulder&t=hk'); await page.wait_for_timeout(1500)
            p('  map: tab/test card open:', await page.evaluate("location.hash + ' | panel: ' + (document.querySelector('#panel')?.className || '')"), '| applink →', await page.evaluate("document.querySelector('.applink').href"))
            await page.screenshot(path=f'{O}/{tag}-map-deeplink.png')
            p('  errors:', errs); await ctx.close()
        # the app: map button, deep link, KB source
        ctx, page = await mkp(b, 390, 844, 2); page.set_default_timeout(6000)
        p('app MAP_URL =', await page.evaluate('MAP_URL'), '| SITE_SRC =', await page.evaluate('SITE_SRC'))
        p('mapLink(ברך, …) =', await page.evaluate("mapLink('ברך', 'lach')"), '| testLink(hk) =', await page.evaluate("testLink('hk')"))
        r = await page.evaluate("loadSite(true).then(v => (v.stale ? 'STALE ' : '') + v.src + ' ' + JSON.stringify(v.data).length + ' regions: ' + Object.keys(v.data.REGIONS || v.data.regions || {}).length).catch(e => 'ERR ' + e)")
        p('KB from /map/ parsed, size:', r)
        p('toolbar map button:', await page.evaluate("[...document.querySelectorAll('a.icon-btn')].map(a => a.href)"))
        p('page errors:', page._errs)
        await b.close()
asyncio.run(main())
