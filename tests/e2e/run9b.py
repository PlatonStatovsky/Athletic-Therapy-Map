import asyncio, os
from playwright.async_api import async_playwright
exec(open('run9.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for (w,h,tag) in [(1000,625,'tablet'),(390,844,'phone')]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', device_scale_factor=1.5)
            page = await ctx.new_page()
            await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
            await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
            await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'soniox', accessCode:'x'}));localStorage.setItem('uqmap-theme','comfort');")
            await page.goto(APP); await page.wait_for_timeout(300)
            await page.evaluate(SEED); await page.wait_for_timeout(300)
            await page.evaluate("recording = true; recSince = Date.now() - 754000; renderRecState(); setFillStatus('מילוי נכשל: Failed to fetch', true);")
            await page.wait_for_timeout(1200)
            if tag == 'phone':
                await page.click('[data-act=missMore]'); await page.wait_for_timeout(200)
                print('phone expanded chips visible:', await page.evaluate("$$('#missing .chip.miss').filter(c => c.offsetParent).length"), '| more visible:', await page.evaluate("!!$('.miss-more')?.offsetParent"))
            print(tag, 'header', await page.evaluate("$('.top').offsetHeight"))
            await page.screenshot(path=f'{OUT}/rec-{tag}.png')
            await ctx.close()
        await b.close()
asyncio.run(main())
