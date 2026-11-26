"""Hypotheses board: threshold, 1–5, stable order with marks, therapist rule-out/add, red flags."""
import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'hypo'); os.makedirs(O, exist_ok=True)
def H(n, st='possible', sup=(), ag=()): return {'name': n, 'path': n, 'status': st, 'support': list(sup), 'against': list(ag), 'tests': []}
SAPS, RCT, TEAR, FROZ, AC, INST = 'SAPS — Subacromial Pain Syndrome', 'RC Tendinopathy / Bursitis', 'קרע RC — Tear', 'Adhesive Capsulitis — כתף קפואה', 'AC Joint', 'Instability'
def J(x): return json.dumps(x, ensure_ascii=False)
async def apply(page, hyps, flags=()):
    await page.evaluate("mapCatalog(session.region).then(cat => { applyInsight(session, %s, ['hypo'], [], cat); session.insDirty = {secs:[], parts:[]}; saveSession(true); refreshLive(); if (view==='finish') renderFinish(); })" % J({'hypotheses': hyps, 'red_flags': [{'text': f, 'fields': ['red_flags']} for f in flags]}))
    await page.wait_for_timeout(600)
BOARD = "JSON.stringify(insState().hypo.map(h => [h.name.slice(0,22), h.status, h.chg || '', h.mine ? 'mine' : '']))"
async def card(page, name):
    loc = page.locator('section.card', has=page.locator('h2', has_text='לוח השערות')).first
    await loc.scroll_into_view_if_needed(); await page.wait_for_timeout(300); await loc.screenshot(path=f'{O}/{name}.png')
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(6000)
    await page.evaluate(EMPTY); await page.wait_for_timeout(300)
    for ids in (['chief_complaint'], ['location'], ['onset'], ['mechanism']):
        await page.evaluate("%s.forEach(id => session.fields[id] = {value:'x', source:'manual'}); saveSession(true)" % J(ids))
        p('  filled +', ids, '→ ready =', await page.evaluate('hypoReady(session)'), '|', (await page.evaluate('hypoHint()'))[:110])
    await page.evaluate("tab='live'; render()"); await page.wait_for_timeout(300)
    await apply(page, [H(SAPS, 'supported', ['Painful Arc חיובי', 'Hawkins חיובי', 'כאב מעל הראש', 'מנגנון עומס']), H(RCT), H(TEAR, 'weakened', [], ['Drop Arm שלילי']), H(FROZ), H(AC), H(INST)])
    p('[1–5] six from the model →', await page.evaluate(BOARD))
    await card(page, f'{tag}-1-first')
    await apply(page, [H(RCT, 'supported'), H(SAPS, 'possible'), H(TEAR, 'weakened'), H(FROZ, 'weakened'), H('PLRI / LCL')])
    p('[8] second update →', await page.evaluate(BOARD), '| gone:', await page.evaluate("insState().hypoGone"))
    await card(page, f'{tag}-2-changes')
    await apply(page, [])
    p('[never empty] model returned [] →', await page.evaluate(BOARD))
    await page.locator('.hyp .hx').nth(2).click(); await page.wait_for_timeout(400)
    p('[9] ruled out one →', await page.evaluate(BOARD), '| off:', await page.evaluate("session.hypoOff.map(h=>h.name)"))
    await apply(page, [H(SAPS), H(TEAR), H(RCT)])
    p('[9] model returns the ruled-out one again →', await page.evaluate(BOARD))
    await page.locator('[data-act=hypoPick]').click(); await page.wait_for_timeout(900)
    p('[9] pick list:', await page.evaluate("[...document.querySelectorAll('.hpick .hp')].length"), 'items, disabled:', await page.evaluate("[...document.querySelectorAll('.hpick .hp:disabled')].length"))
    await page.screenshot(path=f'{O}/{tag}-3-pick.png')
    await page.locator('.hpick .hp:not(:disabled)').first.click(); await page.wait_for_timeout(500)
    added = await page.evaluate("session.hypoMine.map(h=>h.name)")
    p('[9] added by therapist:', added, '→', await page.evaluate(BOARD))
    await apply(page, [H(SAPS), H(RCT), H(FROZ), H(AC), H(INST)])
    p('[9] model omits it, returns 5 →', await page.evaluate(BOARD))
    await card(page, f'{tag}-4-mine')
    c0 = len(CALLS); await page.evaluate("runInsight(false, ['hypo'])"); await page.wait_for_timeout(1200)
    u = CALLS[-1]['messages'][0]['content'] if len(CALLS) > c0 else ''
    p('[9] request carries:', [l[:110] for l in u.split('\n') if l.startswith(('THERAPIST', 'RULED'))], '| schema has red_flags:', 'red_flags' in json.dumps(CALLS[-1].get('output_config', {})) if len(CALLS) > c0 else None)
    await apply(page, [H(SAPS), H(RCT)], flags=['ירידה במשקל לא מוסברת'])
    p('[7] red flag →', await page.evaluate("$('.flagbox')?.innerText.replace(/\\s+/g,' ')"), '| hyps shown:', await page.locator('.hyp').count())
    await card(page, f'{tag}-5-flag')
    await page.locator('[data-act=flagOff]').click(); await page.wait_for_timeout(400)
    p('[7] after "הדגל נשלל" → hyps shown:', await page.locator('.hyp').count(), '| flagbox:', await page.locator('.flagbox').count())
    p('doc:', (await page.evaluate("(vizDocHtml(session).match(/דגלים אדומים[\\s\\S]{0,140}/)||[''])[0]")).replace('\n',' ')[:160])
    await page.evaluate("Object.assign(session.fields, {vas_max:{value:'7',source:'manual'},vas_now:{value:'4',source:'manual'},night:{value:'כן',source:'manual'},aggravating:{value:'הרמה',source:'manual'},neuro_symptoms:{value:'אין',source:'manual'},red_flags:{value:'ירידה במשקל',source:'manual'},medications:{value:'אין',source:'manual'}}); saveSession(true)")
    await page.evaluate("openFinish()"); await page.wait_for_timeout(900)
    p('[finish] view', await page.evaluate('view'), '| controls on finish:', await page.locator('.hyp .hx, [data-act=hypoPick], [data-act=hypoOn]').count())
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
