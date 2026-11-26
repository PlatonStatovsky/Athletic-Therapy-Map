import asyncio, json, os
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
D = os.path.join(HERE, 'ba3')
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 390, 844, 2); page.set_default_timeout(6000)
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.evaluate("session.firstSavedAt = Date.now() - 600e3; session.savedAt = new Date(session.firstSavedAt).toISOString(); session.changedAt = Date.now(); saveSession(true); view='home'; render()"); await page.wait_for_timeout(400)
        await page.evaluate("$('#pName').value = 'מטופל חדש'; $('#pConsent').checked = true; startSession(); 0"); await page.wait_for_timeout(600)
        await page.screenshot(path=f'{D}/after-dlg.png')
        p('dialog:', await page.evaluate("document.querySelector('dialog[open], .dlg')?.innerText"))
        await b.close()
asyncio.run(main())
