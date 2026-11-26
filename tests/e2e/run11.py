"""Map on tablet/phone: search width, display popover, tests button, history (card + region), abbreviation focus, .pn contrast."""
import asyncio, json, os
from playwright.async_api import async_playwright
BASE = 'http://127.0.0.1:8766/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mp'); os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (w, h, tag) in [(1000, 625, 'tablet'), (390, 844, 'phone'), (1440, 900, 'desktop')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=1.5)
            page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            for pat in ['https://fonts.googleapis.com/**', 'https://fonts.gstatic.com/**', 'https://accounts.google.com/**']:
                await page.route(pat, lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
            await page.route('https://www.youtube*/**', lambda r: r.fulfill(status=404, body=''))
            await page.add_init_script("localStorage.setItem('uqmap-theme','comfort')")
            await page.goto(BASE + '#general'); await page.wait_for_timeout(500)
            m = await page.evaluate("({search: Math.round(document.querySelector('.search').getBoundingClientRect().width), bar: document.querySelector('#bar').offsetHeight, testsBtn: !!document.querySelector('#testsBtn').offsetParent, dispBtn: !!document.querySelector('#dispBtn').offsetParent, dispVisible: !!document.querySelector('#disp').offsetParent})")
            print(tag, 'toolbar', m)
            await page.screenshot(path=f'{OUT}/{tag}-top.png')
            if m['dispBtn']:
                await page.click('#dispBtn'); await page.wait_for_timeout(200)
                print(tag, 'disp open:', await page.evaluate("[document.querySelector('#disp').classList.contains('open'), document.querySelector('#dispBtn').getAttribute('aria-expanded')]"))
                await page.screenshot(path=f'{OUT}/{tag}-disp.png')
                await page.keyboard.press('Escape'); await page.wait_for_timeout(100)
                print(tag, 'disp after Esc:', await page.evaluate("document.querySelector('#disp').classList.contains('open')"))
            if m['testsBtn']:
                await page.click('#testsBtn'); await page.wait_for_timeout(300)
                print(tag, 'panel shown with list:', await page.evaluate("[document.querySelector('#panel').classList.contains('shown'), !!document.querySelector('#pbody .tlist')]"))
                await page.screenshot(path=f'{OUT}/{tag}-tests.png')
                await page.click('#pclose'); await page.wait_for_timeout(200)
            # region change pushes history; Back returns
            await page.click('#t-shoulder'); await page.wait_for_timeout(300)
            first = await page.evaluate("document.querySelector('#pbody .tlist [data-test], #main [data-test]')?.dataset.test")
            await page.evaluate(f"document.querySelector('[data-test=\"{first}\"]').click()"); await page.wait_for_timeout(300)
            st = await page.evaluate("[location.hash, history.state, document.querySelector('#panel').classList.contains('shown')]")
            print(tag, 'card open:', st)
            await page.go_back(); await page.wait_for_timeout(400)
            st2 = await page.evaluate("[location.hash, document.querySelector('#panel').classList.contains('shown'), !!document.querySelector('#pbody .tlist')]")
            print(tag, 'after Back:', st2)
            await page.go_back(); await page.wait_for_timeout(400)
            print(tag, 'after 2nd Back (region):', await page.evaluate("[location.hash, document.querySelector('#t-general')?.getAttribute('aria-selected')]"))
            # pattern letter contrast & abbreviation focus on shoulder
            await page.goto(BASE + '#shoulder'); await page.wait_for_timeout(400)
            pn = await page.evaluate("""(() => { const e = document.querySelector('.pat-h .pn'); if (!e) return null; const cs = getComputedStyle(e); return [cs.color, cs.backgroundColor]; })()""")
            ab = await page.evaluate("(() => { const a = document.querySelector('abbr.ab[data-k]'); if (!a) return null; a.focus(); return [a.tabIndex, !document.querySelector('#tip').hidden]; })()")
            print(tag, '.pn colours', pn, '| abbr focus shows tip:', ab, '| h5 in 5D:', await page.evaluate("document.querySelectorAll('.dd h5').length"), 'errors:', errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
