"""Before/after for 24.11: session date span, projection colour, free-text field, red disclaimer."""
import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'ba2'); os.makedirs(D, exist_ok=True)
INS = json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False)
async def demo(page):
    await page.evaluate(SEED); await page.wait_for_timeout(300)
    await page.evaluate(EXAM); await page.wait_for_timeout(300)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(23, 40, 0, 0); session.startedAt = y.toISOString(); saveSession(true); render()" % INS)
    await page.wait_for_timeout(400)
async def card(page, title, path):
    loc = page.locator('section.card', has=page.locator('h2', has_text=title)).first
    await loc.scroll_into_view_if_needed(); await page.wait_for_timeout(300); await loc.screenshot(path=path)
async def run(b, ver, url):
    global APP
    APP = url
    # session screen (phone): free-text field + a note in the list
    ctx, page = await mkp(b, 390, 844, 2)
    await demo(page)
    await page.evaluate("session.notes=[{id:'n1',text:'לבדוק Neer בסוף',at:Date.now(),status:'filed',task:'לבדוק Neer בסוף הבדיקה'}]; saveSession(true); tab='live'; render()")
    await page.wait_for_timeout(500)
    await page.screenshot(path=f'{D}/{ver}-note-phone.png')
    await ctx.close()
    # finish (tablet): header with date, body map, hypotheses
    ctx, page = await mkp(b, 1240, 860, 1.5)
    await demo(page); await finish_from_session(page)
    await page.locator('.ptitle').first.screenshot(path=f'{D}/{ver}-date.png')
    await card(page, 'מפת גוף', f'{D}/{ver}-body.png')
    await card(page, 'השערות', f'{D}/{ver}-hypo.png')
    print(ver, 'sub:', await page.evaluate("$('.ptitle .sub').textContent"), '| errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 'before', 'http://127.0.0.1:8767/app/index.html')
        await run(b, 'after', 'http://127.0.0.1:8766/app/index.html')
        await b.close()
asyncio.run(main())
