"""Final review captures into .impeccable/review/ (1x density: headless Chromium skips backdrop blur at fractional/2x density on this page)."""
import asyncio, os
os.environ['DPR'] = '1'
from playwright.async_api import async_playwright
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run20.py')).read().split('async def main')[0])
R = '/home/claude/athletic-therapy-map/.impeccable/review'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        # the user's tablet: 1000x625, comfort, anamnesis then exam
        ctx, page = await ctxpage(b, 1000, 625, 'comfort'); await page.screenshot(path=f'{R}/user-1000-home.png'); await ctx.close()
        ctx, page = await seeded(b, 1000, 625, 'comfort', extra=", smart:{next:true}")
        await page.screenshot(path=f'{R}/user-1000.png')
        # recording, then a fact lands: the island opens to show it, then settles
        await page.evaluate("recording = true; recSince = Date.now() - 83000; renderRecState(); tickTimer();"); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{R}/user-1000-island-rec.png', clip={'x':0,'y':0,'width':1000,'height':140})
        await page.evaluate("applyUpdates([{id:'night', value:'כאב לילי, מתעורר בשכיבה על צד ימין', quote:'בלילה כשאני שוכב על הצד זה מגיע לשבע'}], buildTranscript(session.segments))"); await page.wait_for_timeout(700)
        await page.screenshot(path=f'{R}/user-1000-island-expanded.png', clip={'x':0,'y':0,'width':1000,'height':160})
        await page.wait_for_timeout(4200); await page.screenshot(path=f'{R}/user-1000-island-settled.png', clip={'x':0,'y':0,'width':1000,'height':140})
        await page.evaluate("recording = false; recSince = 0; renderRecState();")
        await page.click('[data-act=more]'); await page.wait_for_timeout(500); await page.screenshot(path=f'{R}/user-1000-more.png'); await page.click('[data-act=popClose]')
        await page.screenshot(path=f'{R}/user-1000-live-full.png', full_page=True)
        await page.click('[data-act=island]'); await page.wait_for_timeout(600); await page.screenshot(path=f'{R}/user-1000-island-feed.png')
        await page.click('[data-act=popClose]'); await page.wait_for_timeout(200)
        await page.click('[data-act=missLevel][data-k="2"]'); await page.wait_for_timeout(300)
        await page.evaluate("$('#missing').scrollIntoView({block:'start'}); window.scrollBy(0,-80)"); await page.wait_for_timeout(200); await page.screenshot(path=f'{R}/user-1000-missing.png')
        await page.evaluate("$$('.rec-s')[1].scrollIntoView({block:'center'})"); await page.wait_for_timeout(200)
        await page.locator('.rec-s').nth(1).click(); await page.wait_for_timeout(600); await page.screenshot(path=f'{R}/user-1000-record-source.png')
        await page.keyboard.press('Escape'); await page.evaluate("window.scrollTo(0,0)")
        await page.fill('#noteIn', 'לבדוק Neer בסוף'); await page.keyboard.press('Enter'); await page.wait_for_timeout(1500)
        await page.evaluate(EXAM); await page.wait_for_timeout(200); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500)
        await page.screenshot(path=f'{R}/user-1000-exam.png'); await page.screenshot(path=f'{R}/user-1000-exam-full.png', full_page=True)
        for t in ['display', 'smart', 'api']:
            await page.evaluate(f"openSettings('{t}')"); await page.wait_for_timeout(600); await page.screenshot(path=f'{R}/user-1000-settings-{t}.png')
        await page.evaluate("closeSettings()"); await page.wait_for_timeout(400)
        await page.click('[data-act=focus]'); await page.wait_for_timeout(500); await page.screenshot(path=f'{R}/user-1000-focus.png')
        await page.click('[data-act=focus]'); await page.wait_for_timeout(300)
        await page.click('.rail [data-tab=form]'); await page.wait_for_timeout(300); await page.screenshot(path=f'{R}/user-1000-form.png')
        await page.click('[data-act=finish]'); await page.wait_for_timeout(2200); await page.screenshot(path=f'{R}/user-1000-finish-full.png', full_page=True)
        errs += page._errs; await ctx.close()
        for theme in ['light', 'dark']:
            ctx, page = await seeded(b, 1000, 625, theme, exam=True)
            await page.screenshot(path=f'{R}/user-1000-{theme}.png'); errs += page._errs; await ctx.close()
        # desktop and phone
        ctx, page = await seeded(b, 1440, 900, 'light', exam=True, extra=", smart:{next:true}")
        await page.screenshot(path=f'{R}/desktop.png', full_page=True); errs += page._errs; await ctx.close()
        ctx, page = await seeded(b, 390, 844, 'comfort')
        await page.screenshot(path=f'{R}/mobile.png', full_page=True)
        await page.screenshot(path=f'{R}/mobile-viewport.png')
        await page.evaluate("openSettings('smart')"); await page.wait_for_timeout(600); await page.screenshot(path=f'{R}/mobile-settings.png')
        errs += page._errs; await ctx.close()
        ctx, page = await seeded(b, 390, 844, 'dark', exam=True)
        await page.screenshot(path=f'{R}/mobile-dark.png'); errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
