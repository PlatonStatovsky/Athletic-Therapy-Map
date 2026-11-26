"""After the change: gate on סיום, no update buttons, read-only verify rows, symmetric pairs, recording player on the finish screen."""
import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'fin2'); os.makedirs(O, exist_ok=True)
TOAST = "$('#toastHost .toast')?.textContent || ''"
ANAM11 = "['chief_complaint','location','onset','mechanism','vas_max','vas_now','night','aggravating','neuro_symptoms','red_flags','medications']"

async def fresh(page, name='מטופל ריק', typ=None):
    await page.evaluate("session = null; LS.del(K.session); view = 'home'; render()"); await page.wait_for_timeout(200)
    js = EMPTY.replace('מטופל ריק', name)
    if typ: js = js.replace("startSession();", f"setPType('{typ}'); startSession();")
    await page.evaluate(js); await page.wait_for_timeout(400)

async def run(b, w, h, tag):
    p(f'\n================ {tag} {w}x{h} ================')
    ctx, page = await mkp(b, w, h, 1.5)
    # ---- gate ----
    await fresh(page)
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(500)
    p('[3] empty: view =', await page.evaluate('view'), '| toast =', await page.evaluate(TOAST))
    await shot(page, f'{tag}-3-blocked')
    p('[3] required anamnesis fields for this session:', await page.evaluate("stageFields(session,'anamnesis').filter(f => impOf(f) === 1).map(f => f.id).join(',')"))
    await page.evaluate(f"{ANAM11}.slice(0,10).forEach(id => session.fields[id] = {{value:'x', source:'manual'}}); saveSession(true)")
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(500)
    p('[3] 10 of 11 filled: view =', await page.evaluate('view'), '| toast =', await page.evaluate(TOAST))
    await page.evaluate(f"{ANAM11}.forEach(id => session.fields[id] = {{value:'x', source:'manual'}}); saveSession(true)")
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(800)
    p('[3] all 11 filled, no transcript: view =', await page.evaluate('view'))
    await fresh(page)
    await page.evaluate("addSegment('בדיקה', true); saveSession(true)"); await page.wait_for_timeout(200)
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(800)
    p('[3] one transcript line, nothing filled: view =', await page.evaluate('view'))
    await fresh(page)
    await page.evaluate("session.firstSavedAt = Date.now() - 3600e3; session.savedAt = session.firstSavedAt; saveSession(true)")
    await page.evaluate("openFinish()"); await page.wait_for_timeout(800)
    p('[3] already saved to Drive, empty: view =', await page.evaluate('view'))
    await fresh(page, 'מעקב', 'מפגש מעקב')
    p('[3] follow-up session type =', await page.evaluate('session.type'), '| required anamnesis =', await page.evaluate("stageFields(session,'anamnesis').filter(f => impOf(f) === 1).length"))

    # ---- demo session ----
    await page.evaluate("session = null; LS.del(K.session); view = 'home'; render()"); await page.wait_for_timeout(200)
    await page.evaluate(SEED); await page.wait_for_timeout(400)
    await page.evaluate(EXAM); await page.wait_for_timeout(400)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False))
    await page.evaluate(AUDIO); await page.wait_for_timeout(500)
    c0 = len(CALLS)
    await finish_from_session(page)
    p('[4] Claude calls on entering finish with nothing new:', len(CALLS) - c0)
    btns = await page.evaluate(BUTTONS)
    p('[4] update buttons:', [x for x in btns if x.split(' | ')[0] in ('insight', 'hypoNow', 'fillNow')])
    p('[7] editable controls:', await page.evaluate(EDITABLE), '| נקה:', await page.locator('[data-act=vClear]').count())
    p('[7] verify rows:', await page.locator('.vrow').count(), '| אשר:', await page.locator('.vrow [data-act=confirm]').count(), '| ערוך:', await page.locator('.vrow [data-act=edit]').count(), '| ▶:', await page.locator('.vrow [data-act=segPlay]').count())
    cards = await page.evaluate(CARDS)
    p('[5] grid cards [title, x, y, w, h]:'); [p('     ', x) for x in cards['grid']]
    p('[9-10] finish screen:', await page.evaluate(PLAYER), '| parts listed:', await page.locator('#finAudio .audio-part').count())
    await shot(page, f'{tag}-2-finish-top')
    await shot(page, f'{tag}-2-finish-full', full=True)

    # the player survives a redraw (confirm a row)
    await page.evaluate("document.querySelector('#finAudio audio').__mark = 1")
    n0 = await page.locator('.vrow').count()
    await page.locator('.vrow [data-act=confirm]').first.click(); await page.wait_for_timeout(500)
    p('[7] after אשר in a row: rows', n0, '→', await page.locator('.vrow').count(), '| same audio element kept:', await page.evaluate("document.querySelector('#finAudio audio')?.__mark === 1"), '| view =', await page.evaluate('view'))

    # popover on a card: no "בטל מילוי"; confirm keeps it on its button; ערוך goes to the session screen
    vp = page.locator('[data-act=verifyPart]:visible').first
    if await vp.count():
        await vp.click(); await page.wait_for_timeout(500)
        p('[7] card popover buttons:', await page.evaluate("[...document.querySelectorAll('.pop button')].map(b => (b.dataset.act||'') + ':' + b.textContent.trim()).filter(x => !x.startsWith('popClose'))"))
        cb = page.locator('.pop [data-act=confirm]').first
        if await cb.count():
            r0 = await page.evaluate("JSON.stringify(document.querySelector('.pop').getBoundingClientRect())")
            await cb.click(); await page.wait_for_timeout(500)
            p('[7] after אשר in the popover: popover open =', await page.evaluate("!!$('.pop')"), '| rows now:', await page.locator('.vrow').count(), '| popover top before/after:', json.loads(r0)['top'], await page.evaluate("$('.pop')?.getBoundingClientRect().top"))
            await shot(page, f'{tag}-7-popover-after-confirm')
        ed = page.locator('.pop [data-act=edit]').first
        if await ed.count():
            fid = await ed.get_attribute('data-fid')
            await ed.click(); await page.wait_for_timeout(900)
            p(f'[8] popover ערוך ({fid}) → view =', await page.evaluate('view'), '| tab =', await page.evaluate('tab'), '| focused =', await page.evaluate("document.activeElement?.id"))
            await shot(page, f'{tag}-8-popover-edit')
            await finish_from_session(page)
        await page.evaluate("closePop()")
    rs = page.locator('.record [data-act=srcRec]').first
    await rs.click(); await page.wait_for_timeout(400)
    p('[7] record-sentence popover buttons:', await page.evaluate("[...document.querySelectorAll('.pop button')].map(b => (b.dataset.act||'') + ':' + b.textContent.trim()).filter(x => !x.startsWith('popClose'))"))
    await page.evaluate("closePop()")

    # row ערוך → session screen, form tab, the field focused
    er = page.locator('.vrow [data-act=edit]').first
    fid = await er.get_attribute('data-fid')
    await er.click(); await page.wait_for_timeout(900)
    p(f'[8] row ערוך ({fid}) → view =', await page.evaluate('view'), '| tab =', await page.evaluate('tab'), '| focused =', await page.evaluate("document.activeElement?.id"))
    await shot(page, f'{tag}-8-row-edit')

    # coming back after a change in the session screen: one catch-up call; again with nothing new: none
    await page.evaluate("applyUpdates([{id:'medications', value:'אקמול לפי הצורך', quote:'בערך ארבע'}], buildTranscript(session.segments)); saveSession(true)")
    c1 = len(CALLS); await finish_from_session(page)
    p('[4] calls on re-entry after a new field:', len(CALLS) - c1)
    await page.locator('.toolbar [data-act=resume]').first.click(); await page.wait_for_timeout(400)
    c2 = len(CALLS); await finish_from_session(page)
    p('[4] calls on re-entry with nothing new:', len(CALLS) - c2)

    # recording kept only in Drive (reopened session): a button to fetch it
    await page.evaluate("audioDelete(session.id).then(() => { session.audioIds = {1: {id: 'drv1', size: 8000}}; saveSession(true); renderFinish(); })"); await page.wait_for_timeout(800)
    p('[10] audio only in Drive → finish shows:', await page.evaluate("$('#finAudio')?.innerText.replace(/\\s+/g,' ')"))
    await shot(page, f'{tag}-10-drive-only')
    p('page errors:', page._errs)
    await ctx.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone')
        await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
