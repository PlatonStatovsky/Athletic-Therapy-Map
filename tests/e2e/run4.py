"""Merged site check: map at /, assistant at /app/; link both ways, deep link to a test card,
shared theme, knowledge base read from the same site, test chips in the analysis."""
import asyncio, json, os
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:8766/'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'm')
os.makedirs(OUT, exist_ok=True)
ANALYSIS = "## מבדקים\n- [[done: Hawkins-Kennedy ימין — חיובי]]\n- [[done: Painful arc — חיובי]]\n- [[rec: Infraspinatus test]]\n- [[must: Spurling ו-ULTT]]\n- [[rec: Jobe / Empty Can]]"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (w, h, tag) in [(390, 844, 'phone'), (1280, 800, 'tablet')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1.5, locale='he-IL')
            page = await ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
            await page.route('https://fonts.gstatic.com/**', lambda r: r.fulfill(status=404, body=''))
            await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
            await page.route('https://www.youtube*/**', lambda r: r.fulfill(status=404, body=''))
            await page.goto(BASE)
            await page.wait_for_timeout(500)
            vis = await page.is_visible('a.applink')
            await page.screenshot(path=f'{OUT}/{tag}-1-map.png')
            print(tag, 'map: app link visible =', vis, '| theme =', await page.evaluate("document.documentElement.dataset.theme"))
            # choose dark on the map → the app must follow
            await page.evaluate("document.querySelector('#th-dark').click()")
            await page.click('a.applink')
            await page.wait_for_load_state('load'); await page.wait_for_timeout(400)
            print(tag, 'app url:', page.url, '| theme in app =', await page.evaluate("document.documentElement.dataset.theme"), '| getTheme =', await page.evaluate("getTheme()"))
            await page.screenshot(path=f'{OUT}/{tag}-2-app-dark.png')
            # back to comfort via the app
            await page.evaluate("setTheme('comfort')")
            # knowledge base from the same site
            kb = await page.evaluate("""async () => { settings.clientId = ''; const kb = await loadKB('כתף', true); return { titles: kb.docs.map(d => d.title), chars: kb.chars, problems: kb.problems, chapter: kb.docs[0]?.text.includes('כרטיסי מבדקים') }; }""")
            print(tag, 'KB:', json.dumps(kb, ensure_ascii=False)[:300])
            # session with an analysis → test chips
            await page.fill('#pName', 'בדיקה'); await page.select_option('#pRegion', 'כתף'); await page.check('#pConsent')
            await page.click('[data-act="start"]'); await page.wait_for_timeout(200)
            await page.evaluate("(an) => { session.analysis = an; session.analysisAt = Date.now(); saveSession(true); }", ANALYSIS)
            await page.click('#tabs [data-tab="analysis"]'); await page.wait_for_timeout(700)
            chips = await page.evaluate("$$('#testLinks a.chip').map(a => [a.textContent, a.getAttribute('href')])")
            print(tag, 'test chips:', json.dumps(chips, ensure_ascii=False))
            await page.screenshot(path=f'{OUT}/{tag}-3-analysis.png', full_page=True)
            maphref = await page.evaluate("document.querySelector('.top a.icon-btn').getAttribute('href')")
            print(tag, 'session map link:', maphref)
            # deep link into the map
            if chips:
                await page.goto(chips[0][1]); await page.wait_for_timeout(600)
                info = await page.evaluate("[location.hash, document.querySelector('#pbody')?.innerText.slice(0,80), document.documentElement.dataset.theme]")
                print(tag, 'deep link →', json.dumps(info, ensure_ascii=False))
                await page.screenshot(path=f'{OUT}/{tag}-4-deeplink.png')
            print(tag, 'errors:', errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
