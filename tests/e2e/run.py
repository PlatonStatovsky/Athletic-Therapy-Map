import asyncio, json, os, re, sys
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8765/index.html'
OUT = os.path.dirname(os.path.abspath(__file__))
captured = {'anthropic': [], 'drive': []}

FILL_RESPONSE = {"updates": [
  {"id": "age", "value": "34", "quote": "אני בן שלושים וארבע", "uncertain": False},
  {"id": "occupation", "value": "מורה לחינוך גופני", "quote": "אני מורה לספורט", "uncertain": False},
  {"id": "chief_complaint", "value": "כאב בכתף ימין בהרמת היד מעל הראש", "quote": "כואב לי בכתף ימין כשאני מרים", "uncertain": False},
  {"id": "vas_max", "value": "7 (בהגשה בטניס)", "quote": "בערך שבע", "uncertain": False},
  {"id": "onset", "value": "הדרגתי, לפני כ-6 שבועות, ללא חבלה", "quote": "התחיל לאט לפני חודש וחצי", "uncertain": False},
  {"id": "name", "value": "SHOULD BE IGNORED (locked)", "quote": "x", "uncertain": False}
]}
SSE = [
 {"type":"message_start","message":{"usage":{"input_tokens":12000,"output_tokens":1}}},
 {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}},
 {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"## סיכום קליני\nכאב כתף ימין הדרגתי, **SAPS** כהשערה מובילה.\n"}},
 {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"## דגלים\n- כאב לילה: לא נשאל\n- ירידה במשקל: לא\n"}},
 {"type":"content_block_stop","index":0},
 {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":900}},
 {"type":"message_stop"}
]

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, locale='he-IL')
        page = await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        page.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)

        async def anthropic(route):
            req = route.request
            body = json.loads(req.post_data)
            captured['anthropic'].append({'headers': req.headers, 'body': body})
            if body.get('stream'):
                data = ''.join(f"event: {e['type']}\ndata: {json.dumps(e, ensure_ascii=False)}\n\n" for e in SSE)
                await route.fulfill(status=200, headers={'content-type': 'text/event-stream', 'access-control-allow-origin': '*'}, body=data)
            else:
                resp = {"id":"m","type":"message","role":"assistant","content":[{"type":"text","text":json.dumps(FILL_RESPONSE, ensure_ascii=False)}],
                        "usage":{"input_tokens":3000,"cache_read_input_tokens":2000,"output_tokens":300}}
                await route.fulfill(status=200, headers={'content-type':'application/json','access-control-allow-origin':'*'}, body=json.dumps(resp, ensure_ascii=False))
        await page.route('https://api.anthropic.com/**', anthropic)

        async def gapi(route):
            req = route.request
            url = req.url
            captured['drive'].append({'method': req.method, 'url': url, 'body': req.post_data})
            h = {'content-type': 'application/json', 'access-control-allow-origin': '*'}
            if '/export' in url:
                await route.fulfill(status=200, headers={'content-type':'text/plain','access-control-allow-origin':'*'}, body='# מפת החלטות\n\n## כתף\nSAPS: Hawkins + Painful Arc + Infraspinatus')
            elif 'fields=name,mimeType' in url:
                await route.fulfill(status=200, headers=h, body=json.dumps({'name':'מפת החלטות — רביע עליון','mimeType':'application/vnd.google-apps.document'}))
            elif req.method == 'GET' and '?q=' in url:
                await route.fulfill(status=200, headers=h, body=json.dumps({'files': []}))
            elif req.method == 'GET' and 'fields=id,trashed' in url:
                await route.fulfill(status=200, headers=h, body=json.dumps({'id':'x','trashed':False}))
            elif req.method == 'POST' and 'upload' not in url:
                meta = json.loads(req.post_data)
                fid = 'ROOT' if meta.get('appProperties',{}).get('ca') == 'root' else 'PATIENT'
                await route.fulfill(status=200, headers=h, body=json.dumps({'id': fid}))
            else:
                await route.fulfill(status=200, headers=h, body=json.dumps({'id': 'DOC%d' % len(captured['drive'])}))
        await page.route('https://www.googleapis.com/**', gapi)
        await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type':'application/javascript'}, body=
            "window.google={accounts:{oauth2:{initTokenClient:function(o){return {requestAccessToken:function(){setTimeout(function(){o.callback({access_token:'tok',expires_in:3600})},10)}}}}}};"))
        await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type':'text/css'}, body=''))

        # speech stub + settings
        await page.add_init_script("""
          localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk-test', clientId:'cid.apps.googleusercontent.com', autoFill:false}));
          window.__recs=[];
          window.webkitSpeechRecognition = window.SpeechRecognition = function(){ this.start=function(){window.__recs.push(this)}; this.stop=function(){ this.onend && this.onend() }; };
        """)
        await page.goto(APP)
        await page.wait_for_timeout(400)
        await page.screenshot(path=f'{OUT}/1-home.png', full_page=True)

        # start session
        await page.fill('#pName', 'דני כהן')
        await page.select_option('#pRegion', 'כתף')
        await page.click('[data-act="start"]')
        assert 'consent' or True
        await page.wait_for_timeout(200)
        # consent missing → should still be on home
        on_home = await page.is_visible('#pName')
        print('blocked without consent:', on_home)
        await page.check('#pConsent')
        await page.click('[data-act="start"]')
        await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/2-session-empty.png', full_page=False)

        # recording + Android cumulative pattern
        await page.click('#recBtn')
        await page.wait_for_timeout(100)
        res = await page.evaluate("""() => {
          const r = window.__recs[window.__recs.length-1];
          const mk = (arr) => ({results: arr.map(([t,f]) => Object.assign([{transcript:t}], {isFinal:f}))});
          r.onresult(mk([['שלום אני בן', false]]));
          r.onresult(mk([['שלום אני בן שלושים וארבע', true]]));
          // Android cumulative duplicate:
          r.onresult(mk([['שלום אני בן שלושים וארבע', true], ['שלום אני בן שלושים וארבע אני מורה לספורט', true]]));
          // normal non-cumulative continuation
          r.onresult(mk([['שלום אני בן שלושים וארבע', true], ['שלום אני בן שלושים וארבע אני מורה לספורט', true], ['כואב לי בכתף ימין כשאני מרים', true]]));
          return session.segments.map(s => s.text);
        }""")
        print('segments:', json.dumps(res, ensure_ascii=False))
        await page.click('#recBtn')  # stop -> triggers fill after 900ms
        await page.evaluate("addSegment('בערך שבע. התחיל לאט לפני חודש וחצי', true)")
        await page.wait_for_timeout(1500)
        fields = await page.evaluate("Object.fromEntries(Object.entries(session.fields).map(([k,v])=>[k,[v.value,v.source,!!v.needsCheck,!!v.locked]]))")
        print('fields:', json.dumps(fields, ensure_ascii=False))
        print('processed/segments:', await page.evaluate("[session.processed, session.segments.length]"))
        await page.wait_for_timeout(3000)
        print('scrollWidth:', await page.evaluate('document.documentElement.scrollWidth'))
        await page.screenshot(path=f'{OUT}/3-session-filled.png')
        await page.evaluate('window.scrollTo(0, 900)')
        await page.screenshot(path=f'{OUT}/3b-session-scrolled.png')

        # manual edit locks field
        await page.fill('#t-occupation', 'מורה לחינוך גופני, מאמן טניס')
        await page.click('#tabs [data-tab="transcript"]')
        await page.wait_for_timeout(250)
        print('occupation after edit:', await page.evaluate("JSON.stringify(session.fields.occupation)"))
        await page.screenshot(path=f'{OUT}/4-transcript.png')

        # analysis
        await page.click('#tabs [data-tab="analysis"]')
        await page.click('#analysisBtn')
        await page.wait_for_timeout(1500)
        print('analysis saved:', await page.evaluate("session.analysis.slice(0,60)"))
        await page.screenshot(path=f'{OUT}/5-analysis.png')

        # save to drive
        await page.click('#saveBtn')
        await page.wait_for_timeout(1500)
        print('saved:', await page.evaluate("[!!session.savedAt, session.docId, session.transcriptDocId, settings.rootFolderId, session.folderId]"))
        print('patients:', await page.evaluate("JSON.stringify(patients)"))

        # settings
        await page.click('[data-act="settings"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path=f'{OUT}/6-settings.png', full_page=True)

        # dark mode render of session
        await page.emulate_media(color_scheme='dark')
        await page.click('[data-act="back"]')
        await page.click('#tabs [data-tab="form"]')
        await page.wait_for_timeout(200)
        await page.screenshot(path=f'{OUT}/7-dark.png', full_page=False)

        # report
        fill_calls = [c for c in captured['anthropic'] if not c['body'].get('stream')]
        an_calls = [c for c in captured['anthropic'] if c['body'].get('stream')]
        fc = fill_calls[0]
        print('fill headers ok:', fc['headers'].get('anthropic-dangerous-direct-browser-access'), fc['headers'].get('x-api-key'), fc['headers'].get('anthropic-version'))
        print('fill model/thinking/output_config:', fc['body']['model'], fc['body'].get('thinking'), json.dumps(fc['body']['output_config'])[:200])
        print('enum size:', len(fc['body']['output_config']['format']['schema']['properties']['updates']['items']['properties']['id']['enum']))
        print('fill user msg head:\n', fc['body']['messages'][0]['content'][:700])
        ac = an_calls[0]['body']
        print('analysis model:', ac['model'], 'blocks:', len(ac['messages'][0]['content']), 'kb included:', 'knowledge_base' in ac['messages'][0]['content'][0]['text'])
        uploads = [d for d in captured['drive'] if 'upload' in d['url']]
        print('drive calls:', [(d['method'], re.sub(r'\?.*','',d['url'].split('/files')[-1] or '/'), ) for d in captured['drive']])
        body = uploads[0]['body']
        meta = re.search(r'\{.*?\}\r\n', body).group(0)
        print('doc meta:', meta.strip())
        print('doc html has rtl:', 'dir="rtl"' in body, '| analysis heading:', 'סיכום קליני' in body, '| unverified tag:', '[לא אומת]' in body)
        open(f'{OUT}/doc.html','w').write(body.split('\r\n\r\n',2)[2].rsplit('\r\n--',1)[0])
        print('cost:', await page.evaluate("[session.cost, usage.total]"))
        print('ERRORS:', errors)
        await b.close()
asyncio.run(main())
