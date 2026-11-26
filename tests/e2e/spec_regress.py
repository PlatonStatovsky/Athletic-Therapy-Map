"""Screenshots for the functional spec, plus a check of the duplicate 'unlock' action."""
import asyncio, json, os, re
exec(open('run25.py').read().split('async def main')[0])
O = os.path.join(HERE, 'spec_regress'); os.makedirs(O, exist_ok=True)
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
        # ---------- phone ----------
        ctx, page = await mkp(b, 390, 844)
        await page.evaluate("renderSignin()"); await page.wait_for_timeout(500)
        await page.evaluate("$('#fakeGsi') && ($('#fakeGsi').innerHTML = '<b>G</b> כניסה באמצעות Google')")
        await shot(page, 'p01-signin')
        await page.evaluate("renderLocked()"); await shot(page, 'p02-locked')
        await page.evaluate("render()"); await page.wait_for_timeout(300)
        await page.evaluate(SEED); await page.wait_for_timeout(500)
        await page.evaluate("insState(); applyInsight(session, %s, ['record','body','timeline','hypo'], ['complaint','details'], null); saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'hypotheses']}, ensure_ascii=False))
        await page.wait_for_timeout(700)
        await shot(page, 'p04-live')
        await shot(page, 'p04b-live-full', full=True)
        await page.click('[data-act=island]'); await shot(page, 'p05-feed')
        await page.evaluate("closePop(); tab='form'; renderTab()"); await shot(page, 'p06-form')
        await page.evaluate("go('home')"); await shot(page, 'p03-home', full=True)
        await page.evaluate("go('session'); openSettings('api')"); await shot(page, 'p08-settings-api')
        await page.evaluate("openSettings('smart')"); await shot(page, 'p08b-settings-smart')
        await page.evaluate("closeSettings()"); await page.wait_for_timeout(300)
        # finish
        await page.evaluate("session.notes=[{id:'n1',text:'לבדוק Neer בסוף',at:Date.now(),status:'filed',task:'לבדוק Neer בסוף הבדיקה'}]; saveSession(true); openFinish()"); await page.wait_for_timeout(1500)
        await shot(page, 'p07-finish', full=True)
        errs += page._errs; await ctx.close()

        # ---------- tablet / wide ----------
        ctx, page = await mkp(b, 1240, 860, 1.6)
        await page.evaluate(SEED); await page.wait_for_timeout(400)
        await page.evaluate(EXAM); await page.wait_for_timeout(400)
        await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo','next'], ['complaint','details','exam'], null); settings.smart={...SMART_DEFAULT,next:true}; saveSession(true); render()" % json.dumps(INSIGHT, ensure_ascii=False))
        await page.wait_for_timeout(900)
        await shot(page, 't09-exam-wide')
        await page.evaluate("session.analysis = %s; session.analysisAt = Date.now(); tab='analysis'; renderTab()" % json.dumps(ANALYSIS, ensure_ascii=False)); await page.wait_for_timeout(700)
        await shot(page, 't10-analysis')
        await page.evaluate("tab='summary'; renderTab()"); await shot(page, 't10b-summary')
        await page.evaluate("REC.list = %s; REC.loading=false; REC.err=''; view='records'; render()" % json.dumps(RECS, ensure_ascii=False)); await shot(page, 't11-records')
        await page.evaluate("view='session'; session.firstSavedAt = Date.now() - 25*3600e3; session.savedAt = Date.now() - 25*3600e3; session.folderId='f1'; session.addenda=[{at:Date.now()-3600e3,text:'תשובת US: דלקת בבורסה התת-אקרומיאלית, ללא קרע.'}]; render()"); await page.wait_for_timeout(500)
        await shot(page, 't12-locked-record')
        errs += page._errs; await ctx.close()

        # ---------- the duplicate 'unlock' action ----------
        ctx, page = await mkp(b, 1000, 760, 1)
        await page.evaluate(SEED); await page.wait_for_timeout(400)
        await page.evaluate("window.__vu = 0; const _v = vaultUnlock; vaultUnlock = async () => { window.__vu++; throw new Error('stub'); }; 0")
        await page.evaluate("tab='form'; renderTab()"); await page.wait_for_timeout(300)
        await page.fill('#t-occupation', 'סטודנט לפיזיותרפיה'); await page.wait_for_timeout(200)
        await page.locator('#t-age').focus(); await page.wait_for_timeout(400)
        print('field locked after typing:', await page.evaluate("session.fields.occupation.locked"))
        btn = page.locator('#f-occupation [data-act=fieldUnlock]')
        print('button present:', await btn.count())
        await btn.click(); await page.wait_for_timeout(600)
        print('after click → vaultUnlock calls:', await page.evaluate("window.__vu"), '| field still locked:', await page.evaluate("session.fields.occupation.locked"), '| lock screen shown:', await page.evaluate("!!$('.content.lock')"))
        errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
