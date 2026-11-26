import asyncio, json
from playwright.async_api import async_playwright
exec(open('run10.py').read().split('async def main')[0])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
        ctx = await b.new_context(viewport={'width': 1000, 'height': 625}, locale='he-IL', permissions=['microphone'])
        page = await ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        for pat in ['https://fonts.googleapis.com/**', 'https://accounts.google.com/**']:
            await page.route(pat, lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
        await page.route('https://api.anthropic.com/**', lambda r: r.abort())
        await page.add_init_script("""localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'browser', saveAudio:false}));
          window.webkitSpeechRecognition = window.SpeechRecognition = function(){ this.start=function(){ this.onstart && this.onstart() }; this.stop=function(){ this.onend && this.onend() }; this.abort=function(){ this.onend && this.onend() }; };""")
        await page.goto(APP); await page.wait_for_timeout(300); await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.evaluate("addSegment('עוד משפט חדש למילוי', true)")
        await page.click('#feed [data-act=fillNow]'); await page.wait_for_timeout(1200)
        print('fill error:', await page.evaluate("[$('#fillStatus').textContent, !!$('#fillStatus [data-act=fillNow]')]"))
        await page.click('#recBtn'); await page.wait_for_timeout(1500)
        await page.click('[data-act=home]'); await page.wait_for_timeout(300)
        print('home pill:', await page.evaluate("$('.recpill')?.textContent"))
        await page.click('[data-act=settings]'); await page.wait_for_timeout(300)
        print('settings pill:', await page.evaluate("!!$('.recpill')"))
        await page.click('.recpill'); await page.wait_for_timeout(300)
        print('back in session:', await page.evaluate("[view, recording]"))
        # undo an AI fill, then the same value is not filled again
        await page.click('#feed [data-act=undo] >> nth=0'); await page.wait_for_timeout(200)
        uid = await page.evaluate("Object.entries(session.fields).find(([k,v]) => v.rejected)?.[0]")
        again = await page.evaluate(f"(() => {{ const v = session.fields['{uid}'].rejected; return applyUpdates([{{id:'{uid}', value:v, quote:'x'}}], ''); }})()")
        print('undo → field', uid, 'refill of the same value applied:', again)
        print('errors:', errs)
        await b.close()
asyncio.run(main())
