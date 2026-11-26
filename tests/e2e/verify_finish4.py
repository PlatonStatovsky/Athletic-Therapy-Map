import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w, h, tag in [(390, 844, 'phone'), (1240, 860, 'tablet')]:
            ctx, page = await mkp(b, w, h, 2)
            await page.evaluate(SEED); await page.wait_for_timeout(400)
            await page.evaluate(EXAM); await page.wait_for_timeout(400)
            await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False))
            await page.evaluate(AUDIO); await page.wait_for_timeout(400)
            await finish_from_session(page)
            await page.locator('#fVer').evaluate("e => e.closest('section').scrollIntoView()")
            await page.wait_for_timeout(300)
            await page.locator('#fVer').evaluate("e => e.closest('section').id = 'verSec'")
            await page.locator('#verSec').screenshot(path=f'{O}/{tag}-rows.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
