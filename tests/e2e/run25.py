"""Google sign-in gate."""
import asyncio, json, os, re
os.environ['DPR'] = '1'
exec(open('run22.py').read().split('async def ctx_page')[0])
O = os.path.join(HERE, 'p5'); os.makedirs(O, exist_ok=True)
GIS2 = """window.google = { accounts: {
  oauth2: { initTokenClient: cfg => ({ requestAccessToken() { setTimeout(() => cfg.callback({ access_token: 'tok', expires_in: 3600 }), 20); } }) },
  id: { initialize(c) { window.__gsi = c; }, renderButton(el) { el.innerHTML = '<button id="fakeGsi">Sign in with Google</button>'; el.querySelector('button').onclick = () => window.__gsi.callback({ credential: window.__cred || 'good' }); }, prompt() {}, disableAutoSelect() { window.__das = (window.__das || 0) + 1; } } } };"""
STATE = {'signed': False, 'configured': True, 'hdrs': []}
async def session(route):
    m = route.request.method
    if not STATE['configured']: return await route.fulfill(status=404, body='not found')
    if m == 'GET':
        return await route.fulfill(status=200 if STATE['signed'] else 401, content_type='application/json', body=json.dumps({'configured': True, **({'email': 'test@example.com'} if STATE['signed'] else {})}))
    if m == 'POST':
        cred = json.loads(route.request.post_data or '{}').get('credential')
        if cred == 'stranger': return await route.fulfill(status=403, content_type='application/json', body=json.dumps({'error': 'החשבון stranger@x.com לא ברשימת המורשים'}))
        STATE['signed'] = True
        return await route.fulfill(status=200, content_type='application/json', body=json.dumps({'configured': True, 'email': 'test@example.com'}))
    if m == 'DELETE':
        STATE['signed'] = False; return await route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
async def claude(route):
    STATE['hdrs'].append(route.request.headers)
    if not STATE['signed'] and 'x-access-code' not in route.request.headers:
        return await route.fulfill(status=401, content_type='application/json', body=json.dumps({'error': 'צריך להיכנס עם Google'}))
    await anthropic(route)
async def mk(b, w=1000, h=700, settings="{autoFill:false, kbVer:2, siteKB:true}", theme='comfort'):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL')
    page = await ctx.new_page(); page._errs = []
    page.on('pageerror', lambda e: page._errs.append(str(e)))
    page.on('console', lambda m: page._errs.append('console: ' + m.text) if 'Content Security Policy' in m.text else None)
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/javascript'}, body=''))
    await page.route('**/api/session', session)
    await page.route('**/api/claude/**', claude)
    await page.route(re.compile(r'.*/app/(index\.html)?$'), with_csp)
    await page.add_init_script(GIS2 + f"if (!sessionStorage.getItem('seeded')) {{ localStorage.setItem('ca.settings', JSON.stringify({settings})); localStorage.setItem('uqmap-theme','{theme}'); sessionStorage.setItem('seeded','1'); }}")
    await page.goto(APP); await page.wait_for_timeout(700)
    return ctx, page
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, page = await mk(b)
        print('gate shown:', await page.evaluate("!!$('.signin') && !!$('#fakeGsi')"), '| home hidden:', await page.evaluate("!$('.resume, #newBtn, [data-act=newSession]')"))
        await page.screenshot(path=f'{O}/1-gate.png')
        await page.evaluate("window.__cred = 'stranger'"); await page.click('#fakeGsi'); await page.wait_for_timeout(400)
        print('stranger:', await page.evaluate("$('#signinErr')?.textContent"), '| autoSelect off:', await page.evaluate("window.__das"))
        await page.screenshot(path=f'{O}/2-stranger.png')
        await page.evaluate("window.__cred = 'good'"); await page.click('#fakeGsi'); await page.wait_for_timeout(500)
        print('signed in → home:', await page.evaluate("!$('.signin') && document.body.className"), '| aiReady:', await page.evaluate("aiReady()"), '| stored:', await page.evaluate("localStorage.getItem('ca.auth')"))
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500)
        h = STATE['hdrs'][-1] if STATE['hdrs'] else {}
        print('claude call ok, no access code header:', bool(STATE['hdrs']), 'x-access-code' not in h)
        await page.evaluate("openSettings('api')"); await page.wait_for_timeout(400)
        print('account row:', await page.evaluate("$$('.drawer .gi .t').map(t => t.textContent.trim()).filter(t => /Google/.test(t))"))
        await page.screenshot(path=f'{O}/3-settings.png')
        await page.click('[data-act=signOut]'); await page.wait_for_timeout(500)
        print('signed out → gate:', await page.evaluate("!!$('.signin')"), '| stored:', await page.evaluate("localStorage.getItem('ca.auth')"))
        # reload while signed out stays gated; reload signed in opens directly
        await page.reload(); await page.wait_for_timeout(600); print('reload signed out gated:', await page.evaluate("!!$('.signin')"))
        STATE['signed'] = True; await page.reload(); await page.wait_for_timeout(600); print('reload signed in open:', await page.evaluate("!$('.signin')"), '| session kept:', await page.evaluate("session?.patientName"))
        # expired cookie during use → back to gate
        STATE['signed'] = False; await page.evaluate("callClaude({model:'claude-haiku-5-5', max_tokens: 10, messages: []}).catch(e => window.__e = e.message)"); await page.wait_for_timeout(500)
        print('expired → gate:', await page.evaluate("!!$('.signin')"), await page.evaluate("$('#signinErr')?.textContent"))
        # offline with a recent sign-in opens; offline without one is gated
        STATE['signed'] = True; await page.reload(); await page.wait_for_timeout(600)
        await page.route('**/api/session', lambda r: r.abort()); await page.reload(); await page.wait_for_timeout(600)
        print('offline, recent sign-in opens:', await page.evaluate("!$('.signin')"))
        errs += page._errs; await ctx.close()
        # server without sign-in (404) opens as before, with the access code
        STATE['configured'] = False; STATE['signed'] = False
        ctx, page = await mk(b, settings="{accessCode:'x', autoFill:false, kbVer:2, siteKB:true}")
        print('no sign-in on server → opens:', await page.evaluate("!$('.signin')"), '| aiReady via code:', await page.evaluate("aiReady()"))
        errs += page._errs; await ctx.close()
        STATE['configured'] = True
        for th in ['dark']:
            ctx, page = await mk(b, 390, 844, theme=th); await page.screenshot(path=f'{O}/4-gate-390-{th}.png'); errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
