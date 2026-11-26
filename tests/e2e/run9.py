"""Session screen look: seeded session, tablet landscape (Opera ~1000x625), phone, wide; three themes.
Measures the header height and the missing-fields card; saves screenshots to ./s/<tag>.png"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 's')
os.makedirs(OUT, exist_ok=True)
VIEWS = [(1000, 625, 'tablet'), (390, 844, 'phone'), (1280, 800, 'wide'), (800, 1180, 'portrait')]
THEMES = sys.argv[1:] or ['comfort']

SEED = """async () => {
  $('#pName').value = 'רועי לוי'; $('#pRegion').value = 'כתף'; $('#pConsent').checked = true;
  startSession(); await new Promise(r => setTimeout(r, 100));
  session.audioParts = 1;
  const segs = ['מה מביא אותך היום?', 'כאב בכתף ימין כבר שלושה שבועות, בעיקר כשאני מרים את היד מעל הראש', 'זה התחיל אחרי אימון כדורסל?', 'כן, אחרי שחסמתי זריקה', 'מאחת עד עשר כמה זה כואב עכשיו?', 'בערך ארבע, ובלילה כשאני שוכב על הצד זה מגיע לשבע'];
  segs.forEach((t, i) => addSegment(t, false, { speaker: i % 2 ? '2' : '1', t0: Date.now() - (60 - i * 8) * 1000 }));
  const put = (id, value, extra = {}) => { session.fields[id] = { value, source: 'ai', quote: value, ...extra }; };
  put('chief_complaint', 'כאב בכתף ימין בהרמת היד מעל הראש');
  put('onset', 'לפני 3 שבועות, אחרי אימון כדורסל');
  put('vas_now', '4');
  put('vas_max', '7 (בלילה, בשכיבה על הצד)', { needsCheck: true });
  put('occupation', 'סטודנט', { unverified: true, needsCheck: true });
  saveSession(true); render();
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in THEMES:
            for (w, h, tag) in VIEWS:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=2 if w < 900 else 1.5)
                page = await ctx.new_page()
                errs = []
                page.on('pageerror', lambda e: errs.append(str(e)))
                await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
                await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
                await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'soniox', accessCode:'x'}));"
                                           + f"localStorage.setItem('uqmap-theme', '{theme}');")
                await page.goto(APP); await page.wait_for_timeout(300)
                await page.evaluate(SEED); await page.wait_for_timeout(400)
                m = await page.evaluate("""() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.height), Math.round(b.width)]; };
                  return { header: r('.top'), missing: r('#missing'), chips: $$('#missing .chip').length, firstField: r('.sec'), h1: document.querySelector('h1')?.textContent, overflowX: document.documentElement.scrollWidth > innerWidth }; }""")
                print(theme, tag, json.dumps(m, ensure_ascii=False), 'errors:', errs)
                await page.screenshot(path=f'{OUT}/{theme}-{tag}.png')
                await ctx.close()
        await b.close()
asyncio.run(main())
