"""Nav: Summary replaces Transcript; no stage switch (stage follows the form); transcript panel with three widths that hides into a half-circle tab."""
import asyncio, os
os.environ['DPR'] = '1'
from playwright.async_api import async_playwright
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'run20.py')).read().split('async def main')[0])
O = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v'); os.makedirs(O, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, page = await seeded(b, 1000, 625, 'comfort')
        print('nav:', await page.evaluate("$$('.rail .nav-i').map(x => x.textContent.trim())"), 'stage chips:', await page.evaluate("!!$('#stageChips')"), 'stage:', await page.evaluate("session.stage"))
        await page.screenshot(path=f'{O}/1-live-medium.png')
        await page.click('#sidePane [data-act=sideW][data-v=narrow]'); await page.wait_for_timeout(300); await page.screenshot(path=f'{O}/2-narrow.png')
        await page.click('#sidePane [data-act=sideW][data-v=wide]'); await page.wait_for_timeout(300); await page.screenshot(path=f'{O}/3-wide.png')
        await page.click('[data-act=trHide]'); await page.wait_for_timeout(300); await page.screenshot(path=f'{O}/4-hidden-tab.png')
        print('hidden:', await page.evaluate("[!!$('#sidePane'), !!$('.trtab'), $('#trCount')?.textContent, document.activeElement?.className]"))
        await page.click('.trtab'); await page.wait_for_timeout(300)
        print('reopened at:', await page.evaluate("settings.sideW"))
        await page.evaluate(EXAM); await page.wait_for_timeout(300)
        print('stage after exam findings:', await page.evaluate("session.stage"), 'missing:', await page.evaluate("$$('#missing .mrow:not(.disc) span').map(x => x.textContent)"))
        await page.click('.rail [data-tab=summary]'); await page.wait_for_timeout(400); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500)
        await page.screenshot(path=f'{O}/5-summary.png'); await page.screenshot(path=f'{O}/5-summary-full.png', full_page=True)
        await page.fill('#t-therapist_impression', 'נראה כמו SAPS, לבדוק Neer במפגש הבא'); await page.wait_for_timeout(300)
        await page.evaluate("document.activeElement.blur()"); await page.wait_for_timeout(300)
        print('stage after impression:', await page.evaluate("session.stage"))
        errs += page._errs; await ctx.close()
        ctx, page = await seeded(b, 1440, 900, 'light')
        await page.screenshot(path=f'{O}/6-desktop.png'); errs += page._errs; await ctx.close()
        ctx, page = await seeded(b, 390, 844, 'comfort')
        await page.screenshot(path=f'{O}/7-phone.png')
        await page.click('.trtab'); await page.wait_for_timeout(500); await page.screenshot(path=f'{O}/8-phone-transcript.png')
        await page.keyboard.press('Escape'); await page.wait_for_timeout(300)
        print('phone overlay closed:', await page.evaluate("!$('#sidePane') && !!$('.trtab')"), 'tabbar:', await page.evaluate("$$('.tabbar .nav-i').map(x => x.textContent.trim())"))
        errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
