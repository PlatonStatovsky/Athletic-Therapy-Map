"""Priority 2: test results, norm lines, course chart, hypotheses trigger and button, question quotes, bidi numbers."""
import asyncio, json, os, re
os.environ['DPR'] = '1'
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run22.py')).read().split('REGION_SEED =')[0])
O = os.path.join(HERE, 'p2'); os.makedirs(O, exist_ok=True)
INSIGHT['timeline'] = [
  {'when': 'לפני שנתיים', 'days_ago': 730, 'event': 'פריקת כתף ימין במשחק', 'vas': -1, 'pain_state': 'unspecified', 'fields': ['medical_history']},
  {'when': 'לפני 3 שבועות', 'days_ago': 21, 'event': 'חסימת זריקה באימון כדורסל', 'vas': 8, 'pain_state': 'activity', 'fields': ['onset', 'mechanism']},
  {'when': 'לפני 3 שבועות', 'days_ago': 21, 'event': 'כאב במנוחה', 'vas': 4, 'pain_state': 'rest', 'fields': ['onset']},
  {'when': 'לפני שבועיים', 'days_ago': 14, 'event': 'כאב לילי בשכיבה על הצד', 'vas': 7, 'pain_state': 'night', 'fields': ['vas_max']},
  {'when': 'לפני שבוע', 'days_ago': 7, 'event': 'ביקור אצל רופא משפחה', 'vas': -1, 'pain_state': 'unspecified', 'fields': ['onset']},
  {'when': 'לפני שבוע', 'days_ago': 7, 'event': 'צילום רנטגן תקין', 'vas': -1, 'pain_state': 'unspecified', 'fields': ['imaging']},
  {'when': 'היום', 'days_ago': 0, 'event': 'כאב במנוחה', 'vas': 3, 'pain_state': 'rest', 'fields': ['vas_now']},
  {'when': 'היום', 'days_ago': 0, 'event': 'כאב בפעילות', 'vas': 6, 'pain_state': 'activity', 'fields': ['vas_now']}]
INSIGHT['exam'] = {
  'rom': [{'motion': 'Flexion', 'joint': 'shoulder', 'side': 'right', 'degrees': 150, 'painful': True, 'fields': ['arom']}, {'motion': 'Flexion', 'joint': 'shoulder', 'side': 'left', 'degrees': 175, 'painful': False, 'fields': ['arom']},
          {'motion': 'Abduction', 'joint': 'shoulder', 'side': 'right', 'degrees': 120, 'painful': True, 'fields': ['arom']}, {'motion': 'Abduction', 'joint': 'shoulder', 'side': 'left', 'degrees': 170, 'painful': False, 'fields': ['arom']},
          {'motion': 'סיבוב חיצוני', 'joint': 'other', 'side': 'right', 'degrees': 60, 'painful': False, 'fields': ['arom']}, {'motion': 'סיבוב חיצוני', 'joint': 'other', 'side': 'left', 'degrees': 85, 'painful': False, 'fields': ['arom']},
          {'motion': 'Extension', 'joint': 'other', 'side': 'none', 'degrees': 50, 'painful': False, 'fields': ['arom']}],
  'mmt': [{'motion': 'סיבוב חיצוני', 'side': 'right', 'grade': 4.5, 'fields': ['mmt']}, {'motion': 'סיבוב חיצוני', 'side': 'left', 'grade': 5, 'fields': ['mmt']}, {'motion': 'Abduction', 'side': 'none', 'grade': 4, 'fields': ['mmt']}],
  'tests': [{'name': 'Hawkins-Kennedy', 'test_id': 'hk', 'side': 'right', 'result': 'positive', 'value': '', 'fields': ['special_tests']},
            {'name': 'Painful Arc', 'test_id': 'painarc', 'side': 'none', 'result': 'positive', 'value': '', 'fields': ['special_tests']},
            {'name': 'Beighton', 'test_id': '', 'side': 'none', 'result': 'score', 'value': '1/9', 'fields': ['special_tests']},
            {'name': 'Speed', 'test_id': '', 'side': 'none', 'result': 'text', 'value': 'ללא כאב, מתיחה קלה בלבד', 'fields': ['special_tests']},
            {'name': 'Empty Can (Jobe)', 'test_id': 'emptycan', 'side': 'right', 'result': 'equivocal', 'value': '', 'fields': ['special_tests']}]}
SAVED_HYPO = INSIGHT['hypotheses']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, page = await ctx_page(b, 1000, 625)
        await page.evaluate(SEED); await page.wait_for_timeout(200)
        # question-only quote → needsCheck; a patient quote stays as is
        r = await page.evaluate("""() => { applyUpdates([{id:'night', value:'כאב בלילה', quote:'האם יש כאב בלילה?', quote_source:'patient', uncertain:false}, {id:'easing', value:'מנוחה', quote:'כשאני נח זה עובר', quote_source:'patient', uncertain:false}], ''); return [session.fields.night.needsCheck, session.fields.night.asked, session.fields.easing.needsCheck, !!session.fields.easing.asked]; }""")
        print('question quote flags (night needsCheck, asked, easing needsCheck, asked):', r)
        await page.evaluate("session.fields.vas_now = { value: '3 (במנוחה); 6 בפעילות', source: 'ai' }; session.fields.vas_max = { value: '8 (בזריקה) ; בלילה 7', source: 'ai' }; saveSession(true)")
        await page.evaluate(EXAM); await page.wait_for_timeout(200)
        # hypotheses: empty board explains the trigger; the button asks for the hypotheses only
        INSIGHT['hypotheses'] = []
        await page.evaluate("insState().hypo = []; render()"); await page.wait_for_timeout(300)
        print('hypo hint:', await page.evaluate("$('.hypo-empty .hint')?.textContent"), '| button:', await page.evaluate("!!$('[data-act=hypoNow]')"))
        INSIGHT['hypotheses'] = SAVED_HYPO; n0 = len(CALLS)
        await page.click('[data-act=hypoNow]'); await page.wait_for_timeout(1500)
        last = CALLS[-1]; props = list(last['output_config']['format']['schema']['properties'].keys())
        print('button call parts:', props, '| max_tokens', last['max_tokens'], '| hypo now:', await page.evaluate("insState().hypo.length"))
        # typing a field updates graphics after a pause
        n1 = len(CALLS)
        await page.click('.rail [data-tab=form]'); await page.wait_for_timeout(300)
        await page.fill('#t-aggravating', 'הרמת היד מעל הראש'); await page.wait_for_timeout(3300)
        print('typed field → insight calls:', len(CALLS) - n1)
        await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500)
        await page.click('.rail [data-tab=live]'); await page.wait_for_timeout(500)
        await page.screenshot(path=f'{O}/1-session.png', full_page=True)
        info = await page.evaluate("""() => ({ ticks: $$('.tl .tlab').map(t => t.textContent), brk: !!$('.tl .brk'), marks: $$('.tl .pmk').length, lines: $$('.tl .pline').length,
          evs: $$('.tl circle.ev:not(.now)').length, peak: $('.tl .plab')?.textContent, yt: $$('.tl .tick').map(t => t.textContent),
          legend: $$('.card .legend').map(l => l.textContent.trim()).filter(t => /כאב/.test(t))[0],
          ctx: $$('.card p.fine').map(p => p.textContent).find(t => /שיא/.test(t)),
          tests: $$('.test').map(t => t.textContent.replace(/\\s+/g, ' ').trim()), norms: $$('.nrm').map(n => n.textContent), nl: $$('.bar .nl').length,
          minFont: Math.min(...$$('.tl text').map(t => parseFloat(getComputedStyle(t).fontSize))) })""")
        for k, v in info.items(): print(' ', k, ':', v)
        # overlaps among chart text boxes
        ov = await page.evaluate("""() => { const r = $$('.tl text').map(t => [t.textContent, t.getBoundingClientRect()]); const o = [];
          for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i][1], b = r[j][1]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) o.push(r[i][0] + ' × ' + r[j][0]); } return o; }""")
        print('  text overlaps:', ov)
        el = await page.query_selector('.tl'); await el.screenshot(path=f'{O}/2-course.png')
        el = await page.query_selector('.card.span2 .exam'); await el.screenshot(path=f'{O}/3-exam.png')
        errs += page._errs; await ctx.close()
        for (w, h, th) in [(390, 844, 'comfort'), (390, 844, 'dark'), (1440, 900, 'light')]:
            ctx, page = await ctx_page(b, w, h, theme=th)
            await page.evaluate(SEED); await page.evaluate("session.fields.vas_now = { value: '3 (במנוחה); 6 בפעילות', source: 'ai' }; session.fields.vas_max = { value: '8 (בזריקה)', source: 'ai' }"); await page.evaluate(EXAM)
            await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1600); await page.evaluate("render()"); await page.wait_for_timeout(500)
            el = await page.query_selector('.tl'); await el.scroll_into_view_if_needed(); await el.screenshot(path=f'{O}/4-course-{w}-{th}.png')
            print(w, th, 'chart width', await page.evaluate("$('.tl svg')?.getAttribute('width')"), 'min font', await page.evaluate("Math.min(...$$('.tl text').map(t => parseFloat(getComputedStyle(t).fontSize)))"),
                  'overlaps', await page.evaluate("""() => { const r = $$('.tl text').map(t => [t.textContent, t.getBoundingClientRect()]); const o = []; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i][1], b = r[j][1]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) o.push(r[i][0] + ' × ' + r[j][0]); } return o; }"""))
            el = await page.query_selector('.card.span2 .exam')
            if el: await el.scroll_into_view_if_needed(); await el.screenshot(path=f'{O}/5-exam-{w}-{th}.png')
            errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
