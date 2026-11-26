"""Live radar, review form and finish view: tablet 1000x625, phone 390x844, wide 1280x800; comfort + dark."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'r'); os.makedirs(OUT, exist_ok=True)
SEED = """async () => {
  $('#pName').value = 'רועי לוי'; $('#pRegion').value = 'כתף'; $('#pConsent').checked = true;
  startSession(); await new Promise(r => setTimeout(r, 100));
  session.audioParts = 1;
  const segs = ['מה מביא אותך היום?', 'כאב בכתף ימין כבר שלושה שבועות, בעיקר כשאני מרים את היד מעל הראש', 'זה התחיל אחרי אימון כדורסל?', 'כן, אחרי שחסמתי זריקה', 'מאחת עד עשר כמה זה כואב עכשיו?', 'בערך ארבע, ובלילה כשאני שוכב על הצד זה מגיע לשבע'];
  segs.forEach((t, i) => addSegment(t, false, { speaker: i % 2 ? '2' : '1', t0: Date.now() - (60 - i * 8) * 1000 }));
  const tr = buildTranscript(session.segments);
  applyUpdates([{id:'chief_complaint', value:'כאב בכתף ימין בהרמת היד מעל הראש', quote:'כאב בכתף ימין כבר שלושה שבועות'},
                {id:'onset', value:'לפני 3 שבועות, אחרי אימון כדורסל', quote:'זה התחיל אחרי אימון כדורסל'},
                {id:'mechanism', value:'חסימת זריקה בכדורסל', quote:'אחרי שחסמתי זריקה', uncertain:true},
                {id:'vas_now', value:'4', quote:'בערך ארבע'},
                {id:'vas_max', value:'7 (בלילה, בשכיבה על הצד)', quote:'בלילה כשאני שוכב על הצד זה מגיע לשבע'},
                {id:'occupation', value:'סטודנט', quote:'אני לומד באוניברסיטה'}], tr);
  session.processed = session.segments.length; saveSession(true); render();
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in (sys.argv[1:] or ['comfort']):
            for (w, h, tag) in [(1000, 625, 'tablet'), (390, 844, 'phone'), (1280, 800, 'wide')]:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=1.5)
                page = await ctx.new_page(); errs = []
                page.on('pageerror', lambda e: errs.append(str(e)))
                for pat in ['https://fonts.googleapis.com/**', 'https://accounts.google.com/**']:
                    await page.route(pat, lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
                await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'soniox', accessCode:'x'}));" + f"localStorage.setItem('uqmap-theme','{theme}');")
                await page.goto(APP); await page.wait_for_timeout(300)
                await page.evaluate(SEED); await page.wait_for_timeout(300)
                info = await page.evaluate("({tab, feed: $$('.feed-row').length, cap: $$('.cap-row').length, chips: $$('#missing .chip.miss').length, footer: $('.actions').offsetHeight, save: $('#saveState').textContent, header: $('.top').offsetHeight, tabs: $$('#tabs [role=tab]').map(b=>b.getAttribute('aria-selected'))})")
                print(theme, tag, 'live', json.dumps(info, ensure_ascii=False), errs)
                await page.screenshot(path=f'{OUT}/{theme}-{tag}-live.png')
                if theme == 'comfort':
                    await page.click('.chip.miss.i1 >> nth=0'); await page.wait_for_timeout(700)
                    f = await page.evaluate("({tab, active: document.activeElement?.tagName, open: $$('details.stg').map(d=>d.dataset.stage+':'+d.open), empties: $$('.field.empty').length, hit: $$('.field.hit').length})")
                    print(theme, tag, 'jump →', f)
                    await page.screenshot(path=f'{OUT}/{theme}-{tag}-form.png')
                    await page.click('[data-act=finish]'); await page.wait_for_timeout(500)
                    fi = await page.evaluate("({view, ver: $$('.vrow').length, must: $$('.fin .must .chip').length, btn: $('[data-act=saveDrive]')?.textContent})")
                    print(theme, tag, 'finish →', fi)
                    await page.screenshot(path=f'{OUT}/{theme}-{tag}-finish.png', full_page=True)
                    await page.click('[data-act=vConfirm] >> nth=0'); await page.wait_for_timeout(200)
                    print(theme, tag, 'after confirm ver rows:', await page.evaluate("$$('.vrow').length"), '| save state dirty:', await page.evaluate("session.changedAt > 0"))
                await ctx.close()
        await b.close()
asyncio.run(main())
