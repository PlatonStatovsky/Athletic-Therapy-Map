"""Screenshots for the functional spec, plus a check of the duplicate 'unlock' action."""
import asyncio, json, os, re
exec(open('run25.py').read().split('async def main')[0])
O = os.path.join(HERE, 'spec'); os.makedirs(O, exist_ok=True)
STATE['signed'] = True

ANALYSIS = """**אין סימן להפניה דחופה.**
## סיכום קליני
גבר, סטודנט, כאב בכתף ימין 3 שבועות אחרי חסימת זריקה בכדורסל. VAS עכשיו 4, לילה 7 בשכיבה על הצד. AROM מוגבל וכואב בכפיפה ובהרחקה מימין.
## דגלים
- [[done: כאב לילי — בשכיבה על הצד, מכני]]
- [[must: לשאול על ירידה במשקל, חום, היסטוריה של סרטן]]
## השערות עבודה
- **SAPS** — בעד: [[done: Painful Arc חיובי]], [[done: Hawkins-Kennedy חיובי]]. נגד: —. מה יכריע: [[rec: Neer]], [[rec: Infraspinatus test]]
- **RC Tendinopathy** — בעד: כוח ER 4/5. נגד: Empty Can לא חד-משמעי.
## מבדקים
מהעדין לפרובוקטיבי: [[rec: Full Can]] → [[rec: ER Lag]]. לא לבצע עכשיו העמסה מקסימלית.
## מידע חסר
[[must: תרופות]] · [[rec: היסטוריה של פריקות]]"""

RECS = [
  {'name': 'רועי לוי', 'folderId': 'f1', 'last': '2026-11-11T09:10:00Z', 'legacy': [],
   'sessions': [{'id': 'j1', 'started': '2026-11-11T09:10:00Z', 'region': 'כתף', 'type': 'הערכה ראשונית', 'first': 0},
                {'id': 'j0', 'started': '2026-11-03T16:30:00Z', 'region': 'כתף', 'type': 'הערכה ראשונית', 'first': 1}]},
  {'name': 'מיכל כהן', 'folderId': 'f2', 'last': '2026-11-09T12:00:00Z',
   'sessions': [{'id': 'j2', 'started': '2026-11-09T12:00:00Z', 'region': 'ברך', 'type': 'מפגש מעקב', 'first': 0}],
   'legacy': [{'id': 'd9', 'name': 'מפגש 2026-10-20 10:00 — מיכל כהן', 'link': 'https://docs.google.com/document/d/x', 'modified': '2026-10-20T10:00:00Z'}]}]

FAKE_GSI = """document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#fakeGsi{font:500 15px Heebo,system-ui;border:1px solid #dadce0;background:#fff;color:#3c4043;border-radius:999px;padding:10px 22px;display:inline-flex;gap:10px;align-items:center}#fakeGsi b{color:#4285f4;font-weight:700}'; document.head.appendChild(st); });"""

async def mkp(b, w, h, dsf=2):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, locale='he-IL')
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
    await page.route('**/api/session*', session)
    await page.route('**/api/claude/**', claude)
    await page.route('https://www.googleapis.com/**', lambda r: r.fulfill(status=404, body='{}'))
    await page.add_init_script(GIS2 + FAKE_GSI + "if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ca.settings', JSON.stringify({autoFill:false, kbVer:2, siteKB:true, encryptOff:true})); localStorage.setItem('uqmap-theme','comfort'); sessionStorage.setItem('seeded','1'); }")
    await page.goto(APP); await page.wait_for_timeout(800)
    return ctx, page

async def shot(page, name, full=False, clip=None):
    await page.wait_for_timeout(450)
    await page.screenshot(path=f'{O}/{name}.png', full_page=full, clip=clip)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for w, h, d, name in [(390, 844, 2, 'p12-locked-record'), (1240, 860, 1.6, 't12b-locked-fixed')]:
            ctx, page = await mkp(b, w, h, d)
            await page.evaluate(SEED); await page.wait_for_timeout(400)
            await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details'], null); session.firstSavedAt = Date.now() - 25*3600e3; session.savedAt = Date.now() - 25*3600e3; session.folderId='f1'; session.addenda=[{at:Date.now()-3600e3,text:'תשובת US: דלקת בבורסה התת-אקרומיאלית, ללא קרע.'}]; saveSession(true); view='session'; render()" % json.dumps(INSIGHT, ensure_ascii=False))
            await page.wait_for_timeout(600)
            print(name, 'data-side-on:', await page.evaluate("document.documentElement.hasAttribute('data-side-on')"))
            if w > 1000: await page.evaluate("document.documentElement.removeAttribute('data-side-on')")
            await shot(page, name)
            errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
