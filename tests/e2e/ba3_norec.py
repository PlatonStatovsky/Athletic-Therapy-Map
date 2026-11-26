import asyncio, json, os
exec(open('ba3_shots.py').read().split('\nasync def run')[0])
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 1240, 860, 1.5); page.set_default_timeout(6000)
        await demo(page)
        await page.evaluate("session.consent = false; session.consentAt = null; session.segments = []; session.recordedMs = 0; delete session.audioParts; saveSession(true); render()"); await page.wait_for_timeout(500)
        await page.screenshot(path=f'{D}/new-norec-session-tablet.png')
        await page.evaluate("Object.assign(session.fields, {night:{value:'מתעורר בלילה כששוכב על הצד', source:'manual'}, aggravating:{value:'הרמת היד מעל הראש', source:'manual'}, neuro_symptoms:{value:'אין נימול', source:'manual'}, medications:{value:'אקמול לפי הצורך', source:'manual'}, red_flags:{value:'אין', source:'manual'}}); saveSession(true)"); await page.locator("[data-act=finish]:visible").first.click(); await page.wait_for_timeout(900); await page.evaluate("$('#toastHost').innerHTML = ''")
        await page.screenshot(path=f'{D}/new-norec-fintop.png')
        con = page.locator('section.card', has=page.locator('#fCon')).first
        await con.scroll_into_view_if_needed(); await con.screenshot(path=f'{D}/new-norec-consent.png')
        print('sections:', await page.evaluate("[...document.querySelectorAll('.fin-sec h2')].map(h => h.textContent.trim())"), page._errs)
        await b.close()
asyncio.run(main())
