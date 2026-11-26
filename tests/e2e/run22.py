"""Priority 1: region mismatch, Claude through the site's proxy, apiKey migration, encryption with the Google key, CSP."""
import asyncio, json, os, re, sys
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'run20.py')).read()
exec(src.split('async def ctxpage')[0])          # APP, SEED, EXAM, INSIGHT, CALLS, anthropic()
O = os.path.join(HERE, 'w'); os.makedirs(O, exist_ok=True)
REPO = '/home/claude/athletic-therapy-map'
CSP = re.search(r'Content-Security-Policy: (.*)', open(f'{REPO}/_headers').read()).group(1)
GIS = """window.google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken() { setTimeout(() => cfg.callback({ access_token: 'tok', expires_in: 3600 }), 20); } }) } } };"""
DRIVE = {'key': None}
async def drive(route):
    u = route.request.url; m = route.request.method
    if 'upload/drive/v3/files' in u and m == 'POST':
        body = route.request.post_data or ''
        DRIVE['key'] = re.findall(r'\{"v":1.*?\}', body)[0]
        return await route.fulfill(status=200, content_type='application/json', body='{"id":"vk"}')
    if 'spaces=appDataFolder' in u:
        return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': [{'id': 'vk'}] if DRIVE['key'] else []}))
    if '/files/vk?alt=media' in u:
        return await route.fulfill(status=200, content_type='application/json', body=DRIVE['key'])
    await route.fulfill(status=404, body='{}')
HDRS = []
async def proxied(route):
    HDRS.append(route.request.headers); await anthropic(route)
async def with_csp(route):
    r = await route.fetch(); h = dict(r.headers); h['content-security-policy'] = CSP
    await route.fulfill(response=r, headers=h)
async def ctx_page(b, w, h, theme='comfort', settings="{accessCode:'x', clientId:'cid', autoFill:false, kbVer:2, siteKB:true}", keep=False, ctx=None):
    ctx = ctx or await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL')
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    page.on('console', lambda m: page._errs.append('console: ' + m.text) if m.type in ('error', 'warning') and 'Content Security Policy' in m.text else None)
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
    await page.route('**/api/claude/**', proxied)
    await page.route('https://www.googleapis.com/**', drive)
    await page.route(re.compile(r'.*/app/(index\.html)?$'), with_csp)
    init = GIS + (f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('ca.settings', JSON.stringify({settings})); localStorage.setItem('uqmap-theme','{theme}'); sessionStorage.setItem('seeded','1'); }}" if not keep else '')
    await page.add_init_script(init)
    await page.goto(APP); await page.wait_for_timeout(400)
    return ctx, page
REGION_SEED = SEED.replace("$('#pRegion').value = 'כתף'", "$('#pRegion').value = 'מרפק'")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        # 0. an old stored key is removed on load
        ctx, page = await ctx_page(b, 1000, 625, settings="{apiKey:'sk-ant-old', accessCode:'x', clientId:'cid', autoFill:false, kbVer:2, siteKB:true}")
        print('apiKey after load:', await page.evaluate("JSON.parse(localStorage.getItem('ca.settings')).apiKey ?? 'gone'"))
        await page.screenshot(path=f'{O}/0-home.png'); errs += page._errs; await ctx.close()
        # 1. region mismatch: elbow session whose content is the shoulder
        ctx, page = await ctx_page(b, 1000, 625)
        await page.evaluate(REGION_SEED); await page.wait_for_timeout(200)
        await page.evaluate(EXAM); await page.wait_for_timeout(200)
        await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500); await page.evaluate("render()"); await page.wait_for_timeout(200)
        print('mismatch:', await page.evaluate("regionMismatch()"), 'scores:', await page.evaluate("JSON.stringify(regionScores(session))"))
        await page.screenshot(path=f'{O}/1-mismatch.png')
        h = HDRS[-1]; print('proxy headers:', h.get('x-access-code'), 'x-api-key' in h, 'anthropic-dangerous-direct-browser-access' in h, '| model', CALLS[-1].get('model'), '| calls', len(CALLS))
        await page.click('.rail [data-tab=analysis]'); await page.wait_for_timeout(300)
        await page.click('#analysisBtn'); await page.wait_for_timeout(400); await page.screenshot(path=f'{O}/2-analyze-dialog.png')
        print('dialog:', await page.evaluate("$('.dlg h2')?.textContent"))
        await page.click('.dlg .btn.primary'); await page.wait_for_timeout(600)
        print('region now:', await page.evaluate("session.region"), 'banner:', await page.evaluate("!!$('.rgw')"))
        await page.click('[data-act=region]'); await page.wait_for_timeout(300); await page.screenshot(path=f'{O}/3-region-pop.png')
        await page.keyboard.press('Escape')
        # 2. encryption: on, reload, locked, unlock
        await page.evaluate("openSettings('data')"); await page.wait_for_timeout(400)
        await page.click('[data-act=encToggle]'); await page.wait_for_timeout(1500)
        await page.evaluate("audioPut({ sid: session.id, part: 1, t: Date.now(), mime: 'audio/webm', blob: new Blob([new Uint8Array([1,2,3,4,5])]) })"); await page.wait_for_timeout(300)
        stored = await page.evaluate("[JSON.parse(localStorage.getItem('ca.session')).enc, JSON.parse(localStorage.getItem('ca.patients')).enc, settings.encrypt, Object.keys(localStorage).filter(k => (localStorage.getItem(k) || '').includes('רועי'))]")
        print('stored sealed (session, patients, flag):', stored, 'key in drive:', bool(DRIVE['key']))
        await page.screenshot(path=f'{O}/4-encrypt-on.png')
        page2 = await ctx.new_page(); page2._errs = []
        page2.on('pageerror', lambda e: page2._errs.append(str(e)))
        await page2.add_init_script(GIS)
        await page2.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
        await page2.route('https://www.googleapis.com/**', drive); await page2.route('**/api/claude/**', anthropic)
        await page2.goto(APP); await page2.wait_for_timeout(500)
        print('locked on reload:', await page2.evaluate("isLocked()"), await page2.evaluate("!!$('[data-act=unlock]')"))
        await page2.screenshot(path=f'{O}/5-locked.png')
        await page2.click('[data-act=unlock]'); await page2.wait_for_timeout(1200)
        print('unlocked:', await page2.evaluate("[!!session, session?.patientName, patients.length, view]"))
        print('audio decrypts:', await page2.evaluate("audioParts(session.id).then(p => p.map(x => x.blob.size))"))
        await page2.screenshot(path=f'{O}/6-unlocked.png')
        errs += page._errs + page2._errs; await ctx.close()
        print('errors / CSP:', errs); await b.close()
asyncio.run(main())
