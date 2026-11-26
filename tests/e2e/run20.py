"""Thalamus in Apple's language: home, live (anamnesis + exam), island feed, record source popover, notes,
settings drawer tabs, finish visual summary. Anthropic API mocked; the map is the real local index.html."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'u'); os.makedirs(OUT, exist_ok=True)
SEED = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run10.py')).read().split('SEED = """')[1].split('"""')[0]
EXAM = """async () => {
  const add = ['פלקשן ימין מאה חמישים עם כאב, שמאל מאה שבעים וחמש', 'אבדוקציה ימין מאה עשרים כואב, שמאל מאה שבעים', 'סיבוב חיצוני ימין שישים, שמאל שמונים וחמש', 'כוח סיבוב חיצוני ימין ארבע מחמש, שמאל חמש', 'הוקינס חיובי מימין, פיינפול ארק חיובי, דרופ ארם שלילי, אמפטי קן לא ברור'];
  session.stage = 'exam'; add.forEach((t, i) => addSegment(t, false, { speaker: '1', t0: Date.now() - (20 - i * 3) * 1000 }));
  const tr = buildTranscript(session.segments);
  applyUpdates([{id:'arom', value:'Flexion ימין 150° (כאב), שמאל 175°; Abduction ימין 120° (כאב), שמאל 170°; ER ימין 60°, שמאל 85°', quote:'פלקשן ימין מאה חמישים עם כאב'},
    {id:'mmt', value:'ER ימין 4/5, שמאל 5/5', quote:'כוח סיבוב חיצוני ימין ארבע מחמש'},
    {id:'special_tests', value:'Hawkins-Kennedy — ימין — חיובי\\nPainful Arc — ימין — חיובי\\nDrop Arm — ימין — שלילי\\nEmpty Can — ימין — לא ברור', quote:'הוקינס חיובי מימין, פיינפול ארק חיובי'},
    {id:'location', value:'כתף ימין קדמית, מקרין לזרוע', quote:'כאב בכתף ימין כבר שלושה שבועות'}], tr);
  session.processed = session.segments.length; saveSession(true); render();
}"""
INSIGHT = {
  'record': [
    {'section': 'complaint', 'text': 'המטופל מדווח על כאב בכתף ימין בהרמת היד מעל הראש, שהחל לפני כשלושה שבועות לאחר חסימת זריקה באימון כדורסל. עוצמת הכאב כעת 4/10, ומגיעה ל-7/10 בלילה בשכיבה על הצד.', 'fields': ['chief_complaint', 'onset', 'mechanism', 'vas_now', 'vas_max', 'location']},
    {'section': 'details', 'text': 'סטודנט.', 'fields': ['occupation']},
    {'section': 'exam', 'text': 'AROM בכתף ימין מוגבל: Flexion 150° ו-Abduction 120° עם כאב, לעומת 175° ו-170° משמאל. כוח סיבוב חיצוני ימין 4/5. Hawkins-Kennedy ו-Painful Arc חיוביים מימין, Drop Arm שלילי.', 'fields': ['arom', 'mmt', 'special_tests']}],
  'body': [{'zone': 'shoulder', 'side': 'right', 'view': 'both', 'kind': 'pain', 'label': 'כאב בהרמת היד', 'fields': ['chief_complaint']},
           {'zone': 'upper_arm', 'side': 'right', 'view': 'front', 'kind': 'radiation', 'label': 'מקרין לזרוע', 'fields': ['location']}],
  'timeline': [{'when': 'לפני 3 שבועות', 'days_ago': 21, 'event': 'חסימת זריקה באימון כדורסל', 'vas': -1, 'fields': ['onset', 'mechanism']},
               {'when': 'לפני שבועיים', 'days_ago': 14, 'event': 'כאב לילי בשכיבה על הצד', 'vas': 7, 'fields': ['vas_max']},
               {'when': 'לפני שבוע', 'days_ago': 7, 'event': 'ביקור אצל רופא משפחה', 'vas': 5, 'fields': ['onset']}],
  'exam': {'rom': [{'motion': 'Flexion', 'side': 'right', 'degrees': 150, 'painful': True, 'fields': ['arom']}, {'motion': 'Flexion', 'side': 'left', 'degrees': 175, 'painful': False, 'fields': ['arom']},
                   {'motion': 'Abduction', 'side': 'right', 'degrees': 120, 'painful': True, 'fields': ['arom']}, {'motion': 'Abduction', 'side': 'left', 'degrees': 170, 'painful': False, 'fields': ['arom']},
                   {'motion': 'סיבוב חיצוני', 'side': 'right', 'degrees': 60, 'painful': False, 'fields': ['arom']}, {'motion': 'סיבוב חיצוני', 'side': 'left', 'degrees': 85, 'painful': False, 'fields': ['arom']}],
           'mmt': [{'motion': 'סיבוב חיצוני', 'side': 'right', 'grade': 4, 'fields': ['mmt']}, {'motion': 'סיבוב חיצוני', 'side': 'left', 'grade': 5, 'fields': ['mmt']}],
           'tests': [{'name': 'Hawkins-Kennedy', 'test_id': 'hk', 'side': 'right', 'result': 'positive', 'fields': ['special_tests']}, {'name': 'Painful Arc', 'test_id': 'painarc', 'side': 'right', 'result': 'positive', 'fields': ['special_tests']},
                     {'name': 'Drop Arm', 'test_id': 'droparm', 'side': 'right', 'result': 'negative', 'fields': ['special_tests']}, {'name': 'Empty Can (Jobe)', 'test_id': 'emptycan', 'side': 'right', 'result': 'equivocal', 'fields': ['special_tests']}]},
  'hypotheses': [{'name': 'SAPS — Subacromial Pain Syndrome', 'path': 'SAPS — Subacromial Pain Syndrome', 'status': 'supported', 'support': ['Painful Arc חיובי', 'Hawkins-Kennedy חיובי', 'כאב בהרמה מעל הראש'], 'against': [], 'tests': ['neer', 'infra']},
                 {'name': 'RC Tendinopathy / Bursitis', 'path': 'RC Tendinopathy / Bursitis', 'status': 'possible', 'support': ['כוח סיבוב חיצוני 4/5'], 'against': ['Empty Can לא חד-משמעי'], 'tests': ['fullcan', 'patte']},
                 {'name': 'קרע RC — Tear', 'path': 'קרע RC — Tear', 'status': 'weakened', 'support': ['מנגנון טראומטי'], 'against': ['Drop Arm שלילי'], 'tests': ['erlag', 'liftoff']}],
  'next': [{'kind': 'question', 'text': 'האם יש נימול או הקרנה מתחת למרפק?', 'why': 'לשלול מקור צווארי', 'test_id': ''},
           {'kind': 'test', 'text': 'Neer', 'why': 'להבחין בין SAPS לגיד', 'test_id': 'neer'},
           {'kind': 'question', 'text': 'אילו תרופות אתה לוקח?', 'why': 'שדה חובה שעוד לא נאמר', 'test_id': ''}]
}
CALLS = []
async def anthropic(route):
    body = json.loads(route.request.post_data or '{}'); CALLS.append(body)
    props = (((body.get('output_config') or {}).get('format') or {}).get('schema') or {}).get('properties', {})
    if 'updates' in props: out = {'updates': []}
    else:
        out = {k: INSIGHT[k] for k in props if k in INSIGHT}
        if 'notes' in props:
            user = body['messages'][0]['content']; notes = json.loads(user.split('PENDING NOTES (JSON): ')[1].split('\n')[0])
            out['notes'] = [{'id': n['id'], 'field': '' if 'לבדוק' in n['text'] else 'observation', 'task': 'לבדוק Neer בסוף הבדיקה' if 'לבדוק' in n['text'] else ''} for n in notes]
    await asyncio.sleep(0.3)
    await route.fulfill(status=200, headers={'content-type': 'application/json', 'access-control-allow-origin': '*'},
                        body=json.dumps({'content': [{'type': 'text', 'text': json.dumps(out, ensure_ascii=False)}], 'usage': {'input_tokens': 900, 'output_tokens': 400}}))
async def ctxpage(b, w, h, theme, extra=''):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=float(os.environ.get('DPR', '1.5')))
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    page.on('console', lambda m: page._errs.append('console: ' + m.text) if m.type == 'error' else None)
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
    await page.route('https://api.anthropic.com/**', anthropic)
    await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk-test', clientId:'cid', autoFill:false, kbVer:2, siteKB:true, engine:'soniox', accessCode:'x'" + extra + "}));" + f"localStorage.setItem('uqmap-theme','{theme}');")
    await page.goto(APP); await page.wait_for_timeout(400)
    return ctx, page
async def seeded(b, w, h, theme, exam=False, extra=''):
    ctx, page = await ctxpage(b, w, h, theme, extra)
    await page.evaluate(SEED); await page.wait_for_timeout(200)
    if exam: await page.evaluate(EXAM); await page.wait_for_timeout(200)
    await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1200)
    return ctx, page
async def shot(page, name, full=False):
    await page.screenshot(path=f'{OUT}/{name}.png', full_page=full)
async def main():
    only = sys.argv[1] if len(sys.argv) > 1 else 'all'
    async with async_playwright() as p:
        b = await p.chromium.launch()
        themes = ['comfort', 'light', 'dark'] if only in ('all', 'themes') else ['comfort']
        for theme in themes:
            ctx, page = await ctxpage(b, 1000, 625, theme)
            await shot(page, f'{theme}-home')
            await ctx.close()
            ctx, page = await seeded(b, 1000, 625, theme)
            await shot(page, f'{theme}-live'); await shot(page, f'{theme}-live-full', True)
            await page.evaluate(EXAM); await page.wait_for_timeout(200); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1200)
            await shot(page, f'{theme}-exam'); await shot(page, f'{theme}-exam-full', True)
            print(theme, 'errors', page._errs); await ctx.close()
        if only in ('all', 'flow'):
            ctx, page = await seeded(b, 1000, 625, 'comfort', extra=", smart:{next:true}")
            await page.click('[data-act=island]'); await page.wait_for_timeout(500); await shot(page, 'flow-island')
            await page.click('[data-act=popClose]'); await page.wait_for_timeout(200)
            await page.locator('.rec-s').first.click(); await page.wait_for_timeout(500); await shot(page, 'flow-record-src')
            print('src pop:', await page.evaluate("[!!popEl, popKey, $$('.pop .src-q').length, $$('.seg.sourced').length]"))
            await page.keyboard.press('Escape')
            await page.fill('#noteIn', 'לבדוק Neer בסוף'); await page.keyboard.press('Enter'); await page.wait_for_timeout(200)
            await page.fill('#noteIn', 'נראה מתוח, כתף ימין מורמת'); await page.click('[data-act=addNote]'); await page.wait_for_timeout(1500)
            print('notes:', await page.evaluate("session.notes.map(n => [n.status, n.field, n.task])"), 'observation:', await page.evaluate("session.fields.observation?.value"))
            await shot(page, 'flow-notes-full', True)
            for t in ['display', 'smart', 'stt', 'api', 'kb', 'data']:
                await page.evaluate(f"openSettings('{t}')"); await page.wait_for_timeout(500); await shot(page, f'drawer-{t}')
            await page.evaluate("openSettings('smart')"); await page.wait_for_timeout(400)
            await page.click('[data-set="smart.body"]'); await page.wait_for_timeout(300)
            print('body off -> cards:', await page.evaluate("$$('#vizGrid .card-h h2').map(h => h.textContent)"))
            await page.click('[data-set="smart.body"]'); await page.wait_for_timeout(300)
            await page.keyboard.press('Escape'); await page.wait_for_timeout(400)
            print('drawer closed:', await page.evaluate("!$('#drawer')"))
            for k in ['narrow', 'wide', 'hidden']:
                await page.evaluate(f"settings.sideW='{k}'; saveSettings(); render();"); await page.wait_for_timeout(250); await shot(page, f'pane-{k}')
            await page.evaluate("settings.sideW='medium'; saveSettings(); render();")
            await page.click('[data-act=focus]'); await page.wait_for_timeout(300); await shot(page, 'focus')
            await page.click('[data-act=focus]'); await page.wait_for_timeout(200)
            await page.evaluate("settings.density='compact'; saveSettings(); render();"); await page.wait_for_timeout(200); await shot(page, 'compact')
            await page.evaluate("settings.density='comfortable'; saveSettings(); render();")
            await page.click('.nav-i[data-tab=form] >> nth=0'); await page.wait_for_timeout(300); await shot(page, 'form')
            await page.click('.nav-i[data-tab=analysis] >> nth=0'); await page.wait_for_timeout(300); await shot(page, 'analysis-full', True)
            await page.click('[data-act=finish]'); await page.wait_for_timeout(1800); await shot(page, 'finish-full', True)
            doc = await page.evaluate("sessionDocHtml(session)"); open(f'{OUT}/doc.html', 'w').write(doc)
            print('flow errors', page._errs, 'api calls', len(CALLS)); await ctx.close()
        if only in ('all', 'phone'):
            for theme in ['comfort', 'dark']:
                ctx, page = await seeded(b, 390, 844, theme, exam=True)
                await shot(page, f'phone-{theme}'); await shot(page, f'phone-{theme}-full', True)
                if theme == 'comfort':
                    await page.evaluate("openSettings('smart')"); await page.wait_for_timeout(500); await shot(page, 'phone-drawer')
                    await page.evaluate("closeSettings()"); await page.wait_for_timeout(400)
                    await page.click('.tabbar [data-tab=transcript]'); await page.wait_for_timeout(300); await shot(page, 'phone-transcript')
                print('phone', theme, 'errors', page._errs); await ctx.close()
        if only in ('all', 'wide'):
            ctx, page = await seeded(b, 1440, 900, 'light', exam=True)
            await shot(page, 'wide-1440'); print('wide errors', page._errs); await ctx.close()
        await b.close()
asyncio.run(main())
