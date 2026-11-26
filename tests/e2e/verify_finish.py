"""Check the green SRS items for the finish screen ("סיום מפגש") against the code on branch app. Read-only: no code changes."""
import asyncio, json, os, re
exec(open('spec_shots.py').read().split('\nasync def main')[0])
O = os.path.join(HERE, 'fin'); os.makedirs(O, exist_ok=True)

EMPTY = """async () => {
  $('#pName').value = 'מטופל ריק'; $('#pRegion').value = 'כתף'; $('#pConsent').checked = true;
  startSession(); await new Promise(r => setTimeout(r, 100)); saveSession(true); render();
}"""
AUDIO = "audioPut({ sid: session.id, part: 1, t: Date.now() - 55000, mime: 'audio/webm', blob: new Blob([new Uint8Array(4000)], {type:'audio/webm'}) }).then(() => audioPut({ sid: session.id, part: 1, t: Date.now() - 5000, mime: 'audio/webm', blob: new Blob([new Uint8Array(4000)], {type:'audio/webm'}) })); session.audioStarts = {1: Date.now() - 62000}; session.audioEnds = {1: Date.now() - 2000}; saveSession(true)"

BUTTONS = """() => [...document.querySelectorAll('#app button, #app a.btn')].filter(b => b.offsetParent).map(b => (b.dataset.act || 'link') + ' | ' + (b.textContent.trim() || b.getAttribute('aria-label') || '').slice(0, 40))"""
EDITABLE = """() => [...document.querySelectorAll('#app textarea, #app input, #app select, #app [contenteditable=true]')].filter(e => e.offsetParent).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + e.className.split(' ')[0] : ''))"""
CARDS = """() => { const r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
  return { grid: [...document.querySelectorAll('.content .grid > .card')].map(c => [c.querySelector('h2')?.textContent.trim(), ...r(c)]),
           sections: [...document.querySelectorAll('.content > section.card, .content > .card')].map(c => [c.querySelector('h2')?.textContent.trim().replace(/\\s+/g, ' '), ...r(c)]) }; }"""
PLAYER = """() => ({ audioEls: document.querySelectorAll('#app audio').length, audioBox: !!document.querySelector('#audioBox'), segPlay: document.querySelectorAll('#app [data-act=segPlay]').length, player: !!document.querySelector('#player:not([hidden])') })"""

def p(*a): print(*a, flush=True)

async def finish_from_session(page):
    btn = page.locator('[data-act=finish]:visible').first
    await btn.click(); await page.wait_for_timeout(2500)

async def run(b, w, h, tag):
    p(f'\n================ {tag} {w}x{h} ================')
    ctx, page = await mkp(b, w, h, 1.5)

    # ---- item 3: an empty session (nothing said, nothing filled) ----
    await page.evaluate(EMPTY); await page.wait_for_timeout(500)
    fb = page.locator('[data-act=finish]:visible')
    p('[3] empty session: finish button visible =', await fb.count(), '| disabled =', await fb.first.is_disabled() if await fb.count() else '-')
    if await fb.count():
        await fb.first.click(); await page.wait_for_timeout(1500)
        p('[3] after clicking סיום on empty session → view =', await page.evaluate('view'), '| h1 =', await page.evaluate("$('h1')?.textContent"))
        await shot(page, f'{tag}-3-empty-finish', full=True)
    await page.evaluate("session = null; LS.del(K.session); view = 'home'; render()"); await page.wait_for_timeout(300)

    # ---- the demo session: transcript + some fields + exam + insight, audio on the device ----
    await page.evaluate(SEED); await page.wait_for_timeout(400)
    await page.evaluate(EXAM); await page.wait_for_timeout(400)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False))
    await page.evaluate(AUDIO); await page.wait_for_timeout(500)
    await page.evaluate("session.notes=[{id:'n1',text:'לבדוק Neer בסוף',at:Date.now(),status:'filed',task:'לבדוק Neer בסוף הבדיקה'}]; saveSession(true); render()")
    await page.wait_for_timeout(500)
    await shot(page, f'{tag}-0-session')

    # where the whole recording can be heard today: the transcript tab of the session screen
    await page.evaluate("tab='transcript'; renderTab(); renderAudioBox()"); await page.wait_for_timeout(800)
    p('[9-10] session screen, transcript tab:', await page.evaluate(PLAYER))
    await shot(page, f'{tag}-9-session-transcript-audio', full=True)
    await page.evaluate("tab='live'; renderTab()"); await page.wait_for_timeout(300)

    # ---- item 2: reach the finish screen with "סיום" ----
    c0 = len(CALLS)
    await finish_from_session(page)
    p('[2] after סיום → view =', await page.evaluate('view'), '| h1 =', await page.evaluate("$('h1')?.textContent"))
    p('[4] Claude calls made just by opening the finish screen:', len(CALLS) - c0)
    await shot(page, f'{tag}-2-finish-top')
    await shot(page, f'{tag}-2-finish-full', full=True)

    # ---- item 4: update buttons ----
    btns = await page.evaluate(BUTTONS)
    p('[4] visible buttons on the finish screen:'); [p('     ', x) for x in btns]
    upd = [x for x in btns if x.split(' | ')[0] in ('insight', 'hypoNow', 'fillNow')]
    p('[4] update/refresh buttons:', upd)

    # ---- item 5: symmetry ----
    cards = await page.evaluate(CARDS)
    p('[5] visual grid cards [title, x, y, w, h]:'); [p('     ', x) for x in cards['grid']]
    p('[5] sections [title, x, y, w, h]:'); [p('     ', x) for x in cards['sections']]

    # ---- item 7: editing on the page ----
    p('[7] editable controls:', await page.evaluate(EDITABLE))
    p('[7] "נקה" buttons:', await page.locator('[data-act=vClear]:visible').count(), '| "אשר" buttons:', await page.locator('[data-act=vConfirm]:visible').count())
    ta = page.locator('textarea.vin').first
    if await ta.count():
        fid = (await ta.get_attribute('id'))[3:]
        before = await page.evaluate(f"session.fields['{fid}'].value")
        await ta.fill(before + ' (נערך במסך הסיום)')
        await page.locator(f'[data-act=vConfirm][data-fid={fid}]').click(); await page.wait_for_timeout(400)
        p(f'[7] edited "{fid}" inside the finish screen → value now:', await page.evaluate(f"session.fields['{fid}'].value"), '| source:', await page.evaluate(f"session.fields['{fid}'].source"), '| view:', await page.evaluate('view'))
    # popover from a record sentence: what it offers
    rs = page.locator('.record [data-act=srcRec], .record [data-act=src]').first
    if await rs.count():
        await rs.click(); await page.wait_for_timeout(500)
        p('[7-8] popover from a record sentence offers:', await page.evaluate("[...document.querySelectorAll('.pop button')].map(b => (b.dataset.act||'') + ':' + b.textContent.trim()).filter(x => x !== 'popClose:')"))
        await shot(page, f'{tag}-7-popover')
        ed = page.locator('.pop [data-act=edit]').first
        if await ed.count():
            await ed.click(); await page.wait_for_timeout(800)
            p('[8] after "ערוך" in the popover → view =', await page.evaluate('view'), '| tab =', await page.evaluate('tab'), '| field in view =', await page.evaluate("!!document.querySelector('.field.hit, [id^=f-].hit')"))
            await shot(page, f'{tag}-8-after-edit')
            if await page.evaluate('view') != 'finish':
                await finish_from_session(page)
        await page.evaluate("closePop()")

    # ---- item 8: a missing required field row ----
    mr = page.locator('.mrow[data-act=jump]').first
    p('[8] missing-required rows:', await page.locator('.mrow[data-act=jump]').count())
    if await mr.count():
        await mr.click(); await page.wait_for_timeout(800)
        p('[8] after clicking a missing field row → view =', await page.evaluate('view'), '| tab =', await page.evaluate('tab'))
        await shot(page, f'{tag}-8-missing-jump')

    # ---- item 6: back arrow ----
    await finish_from_session(page)
    c1 = len(CALLS)
    back = page.locator('.toolbar [data-act=resume]').first
    p('[6] back arrow in toolbar:', await back.count(), '| aria-label:', await back.get_attribute('aria-label') if await back.count() else '-')
    await back.click(); await page.wait_for_timeout(500)
    p('[6] after back arrow → view =', await page.evaluate('view'))
    # re-entering the finish screen asks Claude again?
    await finish_from_session(page)
    p('[4] Claude calls on re-entering finish (no new speech):', len(CALLS) - c1)

    # ---- items 9-10: player on the finish screen ----
    p('[9-10] finish screen:', await page.evaluate(PLAYER))
    p('[9] recording section text:', await page.evaluate("$('#fRec')?.closest('section')?.innerText.replace(/\\s+/g,' ')"))

    p('page errors:', page._errs)
    await ctx.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone')
        await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
