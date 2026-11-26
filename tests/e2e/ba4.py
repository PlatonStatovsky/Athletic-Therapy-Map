"""Before/after of the hypotheses board (same demo data) and the threshold hint."""
import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'ba4'); os.makedirs(D, exist_ok=True)
INS = json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False)
async def card(page, path):
    loc = page.locator('section.card', has=page.locator('h2', has_text='לוח השערות')).first
    await page.evaluate("document.querySelectorAll('.toolbar, #noteBar, .notebar, .tabbar, nav').forEach(e => e.style.visibility='hidden')"); await loc.scroll_into_view_if_needed(); await page.wait_for_timeout(300); await loc.screenshot(path=path)
async def run(b, ver, port):
    global APP
    APP = f'http://127.0.0.1:{port}/app/'
    ctx, page = await mkp(b, 390, 844, 2); page.set_default_timeout(6000)
    # threshold: complaint + location + onset only
    await page.evaluate(EMPTY); await page.wait_for_timeout(300)
    await page.evaluate("['chief_complaint','location','onset'].forEach(id => session.fields[id] = {value:'x', source:'manual'}); saveSession(true); tab='live'; render()"); await page.wait_for_timeout(500)
    print(ver, 'card present (3 facts):', await page.locator('section.card', has=page.locator('h2', has_text='לוח השערות')).count())
    if await page.locator('section.card', has=page.locator('h2', has_text='לוח השערות')).count(): await card(page, f'{D}/{ver}-threshold.png')
    # demo board
    await page.evaluate("session = null; LS.del(K.session); view='home'; render()"); await page.wait_for_timeout(200)
    await page.evaluate(SEED); await page.wait_for_timeout(300); await page.evaluate(EXAM); await page.wait_for_timeout(300)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); tab='live'; render()" % INS); await page.wait_for_timeout(500)
    await card(page, f'{D}/{ver}-board.png')
    print(ver, 'errors', page._errs); await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 'before', 8767); await run(b, 'after', 8766)
        await b.close()
asyncio.run(main())
