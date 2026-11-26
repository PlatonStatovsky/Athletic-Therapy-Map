"""Finish screen: confirm the body map and the injury course before saving; a changed card asks again; an empty card asks nothing."""
import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'vizver'); os.makedirs(O, exist_ok=True)
TOAST = "$('#toastHost .toast')?.textContent || ''"
VSTATE = "JSON.stringify({ok: [...document.querySelectorAll('.vizok')].map(e => e.innerText.replace(/\\s+/g,' ')), save: $('[data-act=saveDrive]')?.disabled, note: $('#saveRow .err')?.textContent || '', miss: vizMissing(session)})"

async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(6000)
    await page.evaluate("localStorage.setItem('ca.clientId','x.apps.googleusercontent.com')")
    await page.evaluate(SEED); await page.wait_for_timeout(400)
    await page.evaluate(EXAM); await page.wait_for_timeout(400)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False))
    await finish_from_session(page)
    p('clientId ok:', await page.evaluate('!!clientId()'))
    p('[start]', await page.evaluate(VSTATE))
    await shot(page, f'{tag}-1-before')
    await page.evaluate("fin.phase = 'review'; fin.filling = false; $('#saveRow').innerHTML = saveRowHtml(0)")
    await page.evaluate("document.querySelector('[data-act=saveDrive]').disabled = false"); await page.locator('[data-act=saveDrive]').click(); await page.wait_for_timeout(300)
    p('[forced click on save] toast:', await page.evaluate(TOAST), '| phase:', await page.evaluate('fin.phase'))
    await page.locator('[data-act=vizVerify][data-k=body]').click(); await page.wait_for_timeout(400)
    p('[body verified]', await page.evaluate(VSTATE))
    await page.locator('[data-act=vizVerify][data-k=course]').click(); await page.wait_for_timeout(400)
    p('[both verified]', await page.evaluate(VSTATE))
    await shot(page, f'{tag}-2-verified')
    await shot(page, f'{tag}-2-verified-full', full=True)
    # the body map is redrawn with other content → asked again
    await page.evaluate("insState(session).body = insState(session).body.slice(0, 1); saveSession(true); renderFinish()"); await page.wait_for_timeout(400)
    p('[body changed]', await page.evaluate(VSTATE))
    await shot(page, f'{tag}-3-changed')
    # reload keeps the confirmations
    await page.locator('[data-act=vizVerify][data-k=body]').click(); await page.wait_for_timeout(300)
    await page.reload(); await page.wait_for_timeout(900); await page.evaluate("openFinish()"); await page.wait_for_timeout(900)
    p('[after reload]', await page.evaluate(VSTATE))
    # empty cards need nothing
    await page.evaluate("insState(session).body = []; insState(session).timeline = []; delete session.fields.vas_max; delete session.fields.vas_now; saveSession(true); renderFinish()"); await page.wait_for_timeout(400)
    p('[empty cards]', await page.evaluate(VSTATE))
    p('page errors:', page._errs)
    await ctx.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone')
        await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
