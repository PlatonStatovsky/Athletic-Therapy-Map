import asyncio, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'merge'); os.makedirs(D, exist_ok=True)
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 1240, 860, 1)
        r = await page.evaluate("loadSite(true).then(v => ({regions: v.data.REGIONS.map(r => r.id).join(','), tissue: !!v.data.TISSUE, kb: SiteKB.regionText(v.data, 'כתף').length, hasTissueText: SiteKB.regionText(v.data, 'כתף').includes('## רקמות')}))")
        print('app reads map:', r, '| errors:', page._errs); await ctx.close()
        for w, h, tag in [(1240, 860, 'tablet'), (390, 844, 'phone')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1.5, locale='he-IL'); pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:8766/index.html#knee'); await pg.wait_for_timeout(1200)
            await pg.screenshot(path=f'{D}/{tag}-map-knee.png')
            link = await pg.evaluate("(() => { const a = document.querySelector('a.applink'); if (!a) return null; const r = a.getBoundingClientRect(); return {href: a.getAttribute('href'), visible: r.width > 0 && r.height > 0, x: Math.round(r.x), w: Math.round(r.width)}; })()")
            tabs = await pg.evaluate("[...document.querySelectorAll('[role=tab]')].map(t => t.textContent.trim()).join(' | ')")
            await pg.goto('http://127.0.0.1:8766/index.html#shoulder&t=hawkins'); await pg.wait_for_timeout(1000)
            card = await pg.evaluate("document.querySelector('#panel')?.innerText.slice(0, 60).replace(/\\s+/g, ' ')")
            print(tag, '| Thalamus link:', link, '| tabs:', tabs, '| deep link card:', card, '| errors:', errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
