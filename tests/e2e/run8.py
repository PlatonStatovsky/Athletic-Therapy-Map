"""Settings: the Soniox connection test button — success, wrong access code, server not configured, no balance."""
import asyncio, json, os
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'q')
os.makedirs(OUT, exist_ok=True)
state = {'mode': 'ok', 'got': []}

async def soniox_ws(ws):
    def on_msg(m):
        if isinstance(m, (bytes, bytearray)): state['got'].append(('bin', len(m))); return
        if m == '':
            state['got'].append(('eos',))
            ws.send(json.dumps({"tokens": [], "finished": True})); asyncio.get_event_loop().create_task(ws.close()); return
        cfg = json.loads(m); state['got'].append(('cfg', cfg.get('audio_format'), cfg.get('sample_rate')))
        if state['mode'] == 'nobalance':
            ws.send(json.dumps({"error_code": 402, "error_message": "Payment required"})); asyncio.get_event_loop().create_task(ws.close())
    ws.on_message(on_msg)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, locale='he-IL', device_scale_factor=1.5)
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
        await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
        async def keyfn(route):
            code = route.request.headers.get('x-access-code')
            if state['mode'] == 'unconfigured':
                return await route.fulfill(status=500, headers={'content-type': 'application/json'}, body=json.dumps({'error': 'השרת לא הוגדר: חסרים APP_ACCESS_CODE או SONIOX_API_KEY'}, ensure_ascii=False))
            if code != 'good-code-123':
                return await route.fulfill(status=401, headers={'content-type': 'application/json'}, body=json.dumps({'error': 'קוד גישה שגוי'}, ensure_ascii=False))
            await route.fulfill(status=200, headers={'content-type': 'application/json'}, body='{"api_key":"tmp"}')
        await page.route('**/api/soniox-key', keyfn)
        await page.route_web_socket('wss://stt-rt.soniox.com/**', soniox_ws)
        await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', kbVer:2, siteKB:false, engine:'soniox'}));")
        await page.goto(APP); await page.wait_for_timeout(300)
        await page.click('[data-act="settings"]'); await page.wait_for_timeout(200)
        await page.locator('#sEngine').scroll_into_view_if_needed()

        async def run(label, code, mode):
            state['mode'] = mode; state['got'] = []
            await page.fill('#sAccess', code)
            await page.click('[data-act="testSoniox"]'); await page.wait_for_timeout(900)
            print(f'{label:14}', '→', await page.evaluate("document.querySelector('#toastHost').innerText"), '| saved code:', await page.evaluate("settings.accessCode"), '| ws:', state['got'])

        await run('empty', '', 'ok')
        await run('wrong code', 'nope', 'ok')
        await run('unconfigured', 'good-code-123', 'unconfigured')
        await run('no balance', 'good-code-123', 'nobalance')
        await run('ok', 'good-code-123', 'ok')
        await page.screenshot(path=f'{OUT}/settings-soniox-ok.png')
        print('button text after:', await page.evaluate("$('[data-act=testSoniox]').textContent"), '| errors:', errs)
        await b.close()
asyncio.run(main())
