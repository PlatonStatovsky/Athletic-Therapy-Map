"""One sign-in opens the encrypted device data; encryption on by default."""
import asyncio, json, os, re, base64
os.environ['DPR'] = '1'
exec(open('run25.py').read().split('async def main')[0])
O = os.path.join(HERE, 'p7'); os.makedirs(O, exist_ok=True)
WRAP = base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')
APPDATA = {'key': None, 'uploads': 0}
async def session2(route):
    if route.request.method == 'GET' and 'vault=1' in route.request.url and STATE['signed']:
        return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'configured': True, 'email': 'test@example.com', 'vault': WRAP}))
    await session(route)
async def drive2(route):
    u = route.request.url
    if 'spaces=appDataFolder' in u: return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': [{'id': 'vk'}] if APPDATA['key'] else []}))
    if 'upload/drive/v3/files' in u and route.request.method == 'POST' and 'appDataFolder' in (route.request.post_data or ''):
        APPDATA['key'] = re.findall(r'\{"v":1.*?\}', route.request.post_data)[0]; APPDATA['uploads'] += 1
        return await route.fulfill(status=200, content_type='application/json', body='{"id":"vk"}')
    if '/files/vk?alt=media' in u: return await route.fulfill(status=200, content_type='application/json', body=APPDATA['key'])
    await route.fulfill(status=404, body='{}')
POPUPS = "window.__pops = 0; const _itc = window.google.accounts.oauth2.initTokenClient; window.google.accounts.oauth2.initTokenClient = cfg => { const c = _itc(cfg); return { requestAccessToken(o) { window.__pops++; c.requestAccessToken(o); } }; };"
async def page_in(ctx, seed=None):
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
    await page.route('**/api/session*', session2); await page.route('**/api/claude/**', claude)
    await page.route('https://www.googleapis.com/**', drive2)
    await page.add_init_script(GIS2 + POPUPS + (seed or ''))
    await page.goto(APP); await page.wait_for_timeout(900)
    return page
SEEDSET = "if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ca.settings', JSON.stringify({autoFill:false, kbVer:2, siteKB:true})); sessionStorage.setItem('seeded','1'); }"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx = await b.new_context(viewport={'width': 1000, 'height': 700}, locale='he-IL')
        STATE['signed'] = True
        page = await page_in(ctx, SEEDSET)
        await page.evaluate(SEED); await page.wait_for_timeout(400)
        st = await page.evaluate("[settings.encrypt, !!localStorage.getItem('ca.vaultWrap'), JSON.parse(localStorage.getItem('ca.session'))?.enc, JSON.parse(localStorage.getItem('ca.patients'))?.enc, window.__pops, Object.keys(localStorage).filter(k => (localStorage.getItem(k) || '').includes('רועי'))]")
        print('default on after sign-in (encrypt, wrap, session sealed, patients sealed, popups, plaintext keys):', st)
        errs += page._errs; await page.close()
        page = await page_in(ctx)
        print('reopen: no lock, data open, popups:', await page.evaluate("[!$('[data-act=unlock]'), session?.patientName, window.__pops]"))
        await page.evaluate("openSettings('data')"); await page.wait_for_timeout(300); await page.screenshot(path=f'{O}/1-settings.png')
        # sign out → gate, sealed data stays; sign in → opens
        await page.evaluate("signOut()"); await page.wait_for_timeout(1200)
        print('signed out:', await page.evaluate("[!!$('.signin'), typeof session === 'undefined' ? null : session, JSON.parse(localStorage.getItem('ca.session'))?.enc]"))
        await page.click('#fakeGsi'); await page.wait_for_timeout(900)
        print('signed in again:', await page.evaluate("[!$('.signin'), !$('[data-act=unlock]'), session?.patientName, window.__pops]"))
        # turning it off keeps it off
        await page.evaluate("setEncryption(false)"); await page.wait_for_timeout(500)
        errs += page._errs; await page.close()
        page = await page_in(ctx)
        print('turned off stays off:', await page.evaluate("[settings.encrypt, settings.encryptOff, JSON.parse(localStorage.getItem('ca.session'))?.enc ?? 'plain', session?.patientName]"))
        await page.evaluate("setEncryption(true)"); await page.wait_for_timeout(600)
        print('on again via sign-in:', await page.evaluate("[settings.encrypt, JSON.parse(localStorage.getItem('ca.session'))?.enc, window.__pops]"))
        # Drive backup once a Drive token exists
        await page.evaluate("getToken(true).then(() => vaultBackup())"); await page.wait_for_timeout(600)
        print('backup in Drive:', APPDATA['uploads'], await page.evaluate("settings.vaultBackup"))
        errs += page._errs; await page.close(); await ctx.close()
        # legacy device: sealed with the Drive key, no wrapped copy → lock screen once, then sign-in alone
        ctx = await b.new_context(viewport={'width': 1000, 'height': 700}, locale='he-IL')
        page = await page_in(ctx, SEEDSET)
        await page.evaluate(SEED); await page.wait_for_timeout(400)
        await page.evaluate("localStorage.removeItem('ca.vaultWrap')")  # as if sealed before this change, with the Drive key backed up above
        # reseal with the Drive key to mimic an older device
        await page.evaluate("(async () => { const raw = await driveVaultRaw(); await importVault(raw); saveSession(true); savePatients(); })()"); await page.wait_for_timeout(500)
        await page.evaluate("localStorage.removeItem('ca.vaultWrap')")
        errs += page._errs; await page.close()
        page = await page_in(ctx)
        print('legacy → lock screen:', await page.evaluate("!!$('[data-act=unlock]')"))
        await page.click('[data-act=unlock]'); await page.wait_for_timeout(900)
        print('unlocked via Drive:', await page.evaluate("[session?.patientName, !!localStorage.getItem('ca.vaultWrap')]"))
        errs += page._errs; await page.close()
        page = await page_in(ctx)
        print('next open, sign-in alone:', await page.evaluate("[!$('[data-act=unlock]'), session?.patientName, window.__pops]"))
        errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
