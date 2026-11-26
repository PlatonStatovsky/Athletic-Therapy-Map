"""Session without recording consent: no transcript at all (no open button, no side panel, no overlay); a normal session keeps it.
Old no-recording sessions keep their typed lines in the data and in the Drive document.
Run with TAG=before against an older commit served on 8767 (copy of run20.py pointed there) for the before screenshots."""
import asyncio, json, os
exec(open('norec.py').read().split('\nasync def run')[0])
TAG = os.environ.get('TAG', 'after'); O = os.path.join(HERE, 'notr'); os.makedirs(O, exist_ok=True)
TRSTATE = "({open: document.querySelectorAll('[data-act=trOpen]').length, side: !!document.querySelector('#sidePane'), sideOn: document.documentElement.hasAttribute('data-side-on'), notes: !!document.querySelector('#noteBar')?.children.length})"
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(5000)
    await page.evaluate("settings.sideW = 'medium'; saveSettings()")
    await start(page, 'go'); await page.get_by_role('button', name='המשך למפגש ללא הקלטה').click(); await page.wait_for_timeout(700)
    p('no-rec session:', await page.evaluate(TRSTATE))
    await page.screenshot(path=f'{O}/{TAG}-{tag}-norec.png')
    await page.evaluate("[...document.querySelectorAll('[data-act=trOpen]')].find(b => b.offsetParent)?.click(); 0"); await page.wait_for_timeout(500)
    p('no-rec after a trOpen click (if any):', await page.evaluate(TRSTATE))
    # an older no-recording session that already has typed lines
    await page.evaluate("addSegment('שורה שהוקלדה קודם', true); saveSession(true); renderSession()"); await page.wait_for_timeout(400)
    p('old typed lines kept:', await page.evaluate("session.segments.length"), '| in Drive doc:', await page.evaluate("transcriptDocHtml(session).includes('שורה שהוקלדה קודם') && transcriptDocHtml(session).includes('טקסט מוקלד')"))
    # normal session
    await page.evaluate("session = null; LS.del(K.session); view='home'; render()"); await page.wait_for_timeout(200)
    await page.evaluate("$('#pName').value = 'רגיל'; $('#pRegion').value = 'ברך'; $('#pConsent').checked = true; window.__p = startSession(); 0"); await page.wait_for_timeout(700)
    p('normal session:', await page.evaluate(TRSTATE))
    await page.screenshot(path=f'{O}/{TAG}-{tag}-normal.png')
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
