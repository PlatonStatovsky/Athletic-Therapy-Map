"""Before/after screenshots of the finish screen for the SRS doc."""
import asyncio, json, os, sys
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'ba'); os.makedirs(D, exist_ok=True)
INS = json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False)
async def demo(page):
    await page.evaluate(SEED); await page.wait_for_timeout(400)
    await page.evaluate(EXAM); await page.wait_for_timeout(400)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % INS)
    await page.evaluate(AUDIO); await page.wait_for_timeout(500)
    await finish_from_session(page)
async def run(b, ver, url):
    global APP
    APP = url
    # 1 empty session, phone
    ctx, page = await mkp(b, 390, 844, 2)
    await page.evaluate(EMPTY); await page.wait_for_timeout(400)
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(1500)
    await page.screenshot(path=f'{D}/{ver}-1-empty.png')
    await ctx.close()
    # 2 tablet top, 3 popover
    ctx, page = await mkp(b, 1240, 860, 1.5)
    await demo(page); await page.wait_for_timeout(500)
    await page.screenshot(path=f'{D}/{ver}-2-top.png')
    await page.locator('[data-act=verifyPart]:visible').first.click(); await page.wait_for_timeout(600)
    await page.screenshot(path=f'{D}/{ver}-4-popover.png')
    await ctx.close()
    # 3 rows, phone
    ctx, page = await mkp(b, 390, 844, 2)
    await demo(page)
    await page.locator('#fVer').evaluate("e => { const s = e.closest('section'); s.id = 'verSec'; s.scrollIntoView(); }")
    await page.wait_for_timeout(400)
    await page.locator('#verSec').screenshot(path=f'{D}/{ver}-3-rows.png')
    print(ver, 'errors:', page._errs); await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 'before', 'http://127.0.0.1:8767/app/index.html')
        await run(b, 'after', 'http://127.0.0.1:8766/app/index.html')
        await b.close()
asyncio.run(main())
