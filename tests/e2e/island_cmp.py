import asyncio, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'norec')
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 390, 844, 2); page.set_default_timeout(5000)
        await page.evaluate(EMPTY); await page.wait_for_timeout(600)
        await page.screenshot(path=f'{O}/phone-cmp-rec.png', clip={'x':0,'y':0,'width':390,'height':70})
        p(await page.evaluate("$('#island').outerHTML"))
        p(await page.evaluate("[...$('#island').children].map(c => c.className + ' ' + JSON.stringify(c.getBoundingClientRect()))"))
        await b.close()
asyncio.run(main())
