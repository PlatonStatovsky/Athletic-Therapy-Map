"""Threshold hint names every field that counts (first visit and follow-up).
The no-recording transcript label it also checked was dropped with the transcript itself (see norec_tr.py).
Run with TAG=before against an older commit served on 8767 (copy of run20.py pointed there) for the before screenshots."""
import asyncio, json, os
exec(open('norec.py').read().split('\nasync def run')[0])
TAG = os.environ.get('TAG', 'after'); O = os.path.join(HERE, 'hint'); os.makedirs(O, exist_ok=True)
HYPO_CARD = "section.card:has(h2:text('לוח השערות'))"
async def hint_card(page, name):
    loc = page.locator('section.card', has=page.locator('h2', has_text='לוח השערות')).first
    await loc.scroll_into_view_if_needed(); await page.wait_for_timeout(300); await loc.screenshot(path=f'{O}/{name}.png')
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(5000)
    await page.evaluate(EMPTY); await page.wait_for_timeout(300)
    await page.evaluate("session.fields.chief_complaint = {value:'כאב בכתף', source:'manual'}; session.fields.arom = {value:'Flexion 150', source:'manual'}; saveSession(true); syncStage(); tab='live'; render()"); await page.wait_for_timeout(300)
    p('first visit hint:', await page.evaluate('hypoHint()'))
    await hint_card(page, f'{TAG}-{tag}-first')
    await page.evaluate("session.type = 'מפגש מעקב'; saveSession(true); render()"); await page.wait_for_timeout(300)
    p('follow-up hint:', await page.evaluate('hypoHint()'))
    p('palpation counts → ready after location + observation:', await page.evaluate("(session.fields.location={value:'x',source:'manual'}, session.fields.observation={value:'x',source:'manual'}, hypoReady(session))"))
    await page.evaluate("delete session.fields.location; delete session.fields.observation; saveSession(true); render()"); await page.wait_for_timeout(300)
    await hint_card(page, f'{TAG}-{tag}-followup')
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
