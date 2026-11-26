"""Before/after images for the 24.11 second round."""
import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'ba3'); os.makedirs(D, exist_ok=True)
INS = json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False)
async def demo(page):
    await page.evaluate(SEED); await page.wait_for_timeout(300)
    await page.evaluate(EXAM); await page.wait_for_timeout(300)
    await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % INS)
    await page.wait_for_timeout(400)
async def run(b, ver, port):
    global APP
    APP = f'http://127.0.0.1:{port}/app/'
    # 1. regions list (home screen select, opened as a list)
    ctx, page = await mkp(b, 390, 844, 2); page.set_default_timeout(6000)
    await page.evaluate("const s = $('#pRegion'); s.size = s.options.length; s.style.height = 'auto'; s.style.background='var(--card)'")
    await page.locator('#pRegion').screenshot(path=f'{D}/{ver}-regions.png')
    # 2. locked record on a wide screen (bug 3)
    await ctx.close(); ctx, page = await mkp(b, 1240, 860, 1.5); page.set_default_timeout(6000)
    await demo(page)
    await page.evaluate("view='session'; session.firstSavedAt = Date.now() - 25*3600e3; session.savedAt = session.firstSavedAt; session.folderId='f1'; render()"); await page.wait_for_timeout(700)
    await page.screenshot(path=f'{D}/{ver}-locked.png')
    await page.evaluate("session = null; LS.del(K.session); view='home'; render()"); await page.wait_for_timeout(300)
    # 3. finish screen, body map + course cards and the save row
    await demo(page); await finish_from_session(page)
    g = page.locator('.fin .grid').first
    await g.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
    await g.screenshot(path=f'{D}/{ver}-cards.png')
    await page.locator('#saveRow').scroll_into_view_if_needed(); await page.wait_for_timeout(300)
    await page.locator('#saveRow').screenshot(path=f'{D}/{ver}-saverow.png')
    # 4. recorded session finish top (the הקלטה section) for comparison
    await page.evaluate("window.scrollTo(0,0)"); await page.wait_for_timeout(300)
    await page.screenshot(path=f'{D}/{ver}-fintop.png')
    print(ver, 'errors:', page._errs)
    await ctx.close()
    # 5. site root
    ctx = await b.new_context(viewport={'width': 1240, 'height': 860}, device_scale_factor=1.5, locale='he-IL'); pg = await ctx.new_page()
    await pg.add_init_script("localStorage.setItem('uqmap-theme','comfort')")
    await pg.goto(f'http://127.0.0.1:{port}/'); await pg.wait_for_timeout(1500)
    await pg.screenshot(path=f'{D}/{ver}-root.png')
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 'before', 8767)
        await run(b, 'after', 8766)
        await b.close()
asyncio.run(main())
