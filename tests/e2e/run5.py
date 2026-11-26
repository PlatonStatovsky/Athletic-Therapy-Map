"""New features: quote verification, extraction params, browser-engine watchdog and empty-final restart,
audio saving (fake microphone), Soniox streaming (mocked WebSocket + key function), Drive audio upload."""
import asyncio, json, os, re
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'n')
os.makedirs(OUT, exist_ok=True)
cap = {'fill': [], 'ws_cfg': None, 'ws_bin': 0, 'ws_text': [], 'drive': [], 'keyreq': []}

FILL = {"updates": [
    {"id": "special_tests", "value": "Empty Can — חיובי\nFull Can (פולקן) — חיובי", "quote": "נעשה מבדק אמפטן ו פולקן", "uncertain": True},
    {"id": "occupation", "value": "מורה", "quote": "אני עובד כמורה בבית ספר", "uncertain": False}]}

async def soniox_ws(ws):
    def on_msg(m):
        if isinstance(m, (bytes, bytearray)):
            cap['ws_bin'] += 1; return
        if m == '':
            cap['ws_text'].append('<eos>')
            ws.send(json.dumps({"tokens": [{"text": " הכול", "is_final": True, "speaker": "2"}, {"text": "<end>", "is_final": True}], "finished": False}))
            ws.send(json.dumps({"tokens": [], "finished": True}))
            asyncio.get_event_loop().create_task(ws.close()); return
        cfg = json.loads(m); cap['ws_cfg'] = cfg
        # the server answers with tokens: speaker 1 asks, speaker 2 answers, endpoint markers in between
        ws.send(json.dumps({"tokens": [{"text": "מה", "is_final": True, "speaker": "1"}, {"text": " גיל", "is_final": True, "speaker": "1"}, {"text": "ך", "is_final": True, "speaker": "1"}, {"text": " עוצמת", "is_final": False, "speaker": "1"}]}))
        ws.send(json.dumps({"tokens": [{"text": "?", "is_final": True, "speaker": "1"}, {"text": "<end>", "is_final": True}]}))
        ws.send(json.dumps({"tokens": [{"text": "אני", "is_final": True, "speaker": "2"}, {"text": " בן", "is_final": True, "speaker": "2"}, {"text": " 22", "is_final": True, "speaker": "2"}]}))
        ws.send(json.dumps({"tokens": [{"text": " מבדק", "is_final": True, "speaker": "1"}, {"text": " פול", "is_final": True, "speaker": "1"}, {"text": " קן", "is_final": True, "speaker": "1"}, {"text": " חיובי", "is_final": True, "speaker": "1"}]}))
    ws.on_message(on_msg)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800}, locale='he-IL', permissions=['microphone'])
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
        await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
        await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=
            "window.google={accounts:{oauth2:{initTokenClient:function(o){return {requestAccessToken:function(){setTimeout(function(){o.callback({access_token:'tok',expires_in:3600})},10)}}}}}};"))

        async def anthropic(route):
            body = json.loads(route.request.post_data); cap['fill'].append(body)
            resp = {"content": [{"type": "text", "text": json.dumps(FILL, ensure_ascii=False)}], "usage": {"input_tokens": 100, "output_tokens": 50}}
            await route.fulfill(status=200, headers={'content-type': 'application/json', 'access-control-allow-origin': '*'}, body=json.dumps(resp, ensure_ascii=False))
        await page.route('https://api.anthropic.com/**', anthropic)

        async def keyfn(route):
            cap['keyreq'].append(route.request.headers.get('x-access-code'))
            await route.fulfill(status=200, headers={'content-type': 'application/json'}, body=json.dumps({'api_key': 'snx_temp_test'}))
        await page.route('**/api/soniox-key', keyfn)
        await page.route_web_socket('wss://stt-rt.soniox.com/**', soniox_ws)

        async def gapi(route):
            req, url = route.request, route.request.url
            cap['drive'].append((req.method, url.split('?')[0].split('/drive/v3')[-1], url.split('?')[1][:40] if '?' in url else ''))
            h = {'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Location'}
            if 'uploadType=resumable' in url:
                return await route.fulfill(status=200, headers={**h, 'Location': 'https://www.googleapis.com/upload/drive/v3/files?upload_id=SESSION1'}, body='{}')
            if 'upload_id=SESSION1' in url and req.method == 'PUT':
                return await route.fulfill(status=200, headers=h, body=json.dumps({'id': 'AUDIO1'}))
            if '?q=' in url: return await route.fulfill(status=200, headers=h, body=json.dumps({'files': []}))
            if req.method == 'POST' and 'upload' not in url:
                meta = json.loads(req.post_data); return await route.fulfill(status=200, headers=h, body=json.dumps({'id': 'ROOT' if meta.get('appProperties', {}).get('ca') == 'root' else 'PAT'}))
            await route.fulfill(status=200, headers=h, body=json.dumps({'id': 'DOC', 'trashed': False}))
        await page.route('https://www.googleapis.com/**', gapi)

        await page.add_init_script("""
          localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, saveAudio:true, engine:'browser', accessCode:'code123'}));
          window.__recs=[]; window.__aborts=0;
          window.webkitSpeechRecognition = window.SpeechRecognition = function(){ this.start=function(){window.__recs.push(this); this.onstart && this.onstart()}; this.stop=function(){ this.onend && this.onend() }; this.abort=function(){ window.__aborts++; this.onend && this.onend() }; };
        """)
        await page.goto(APP); await page.wait_for_timeout(300)
        await page.fill('#pName', 'בדיקה'); await page.select_option('#pRegion', 'כתף'); await page.check('#pConsent')
        await page.click('[data-act="start"]'); await page.wait_for_timeout(200)

        # ---- quote verification + extraction parameters
        await page.evaluate("addSegment('נעשה מבדק אמפטן ו פולקן נייר טסט כולם יצאו חיוביים', true)")
        await page.click('[data-act="fillNow"]'); await page.wait_for_timeout(800)
        f = await page.evaluate("({st: session.fields.special_tests, oc: session.fields.occupation})")
        print('special_tests verified:', not f['st'].get('unverified'), '| occupation (quote not in transcript) unverified:', f['oc'].get('unverified'), 'needsCheck:', f['oc'].get('needsCheck'))
        badge = await page.evaluate("!!document.querySelector('#f-occupation .badge.bad')")
        fb = cap['fill'][-1]
        print('fill params:', fb.get('output_config', {}).get('effort'), fb.get('thinking'), '| glossary in prompt:', 'פולקן' in fb['system'][0]['text'], '| bad badge shown:', badge)

        # ---- browser engine: empty final restart + watchdog; audio saved alongside
        await page.click('#recBtn'); await page.wait_for_timeout(500)
        await page.evaluate("""() => { const r = window.__recs[window.__recs.length-1];
          const mk = (arr) => ({results: arr.map(([t,f]) => Object.assign([{transcript:t}], {isFinal:f}))});
          r.onresult(mk([['כאב בכתף ימין', true]])); r.onresult(mk([['כאב בכתף ימין', true], ['', true]])); }""")
        await page.wait_for_timeout(700)
        a1 = await page.evaluate("window.__aborts")
        print('empty final → restart (aborts):', a1, '| restart logged:', await page.evaluate("rawLog.filter(x => x.restart).map(x => x.restart)"))
        await page.wait_for_timeout(13500)
        a2 = await page.evaluate("window.__aborts")
        print('watchdog after silence → aborts now:', a2, await page.evaluate("rawLog.filter(x => x.restart).map(x => x.restart)"))
        await page.click('#recBtn'); await page.wait_for_timeout(1500)
        parts = await page.evaluate("audioParts(session.id).then(ps => ps.map(p => [p.part, p.blob.size, p.mime]))")
        print('audio parts after browser-engine recording:', parts)

        # ---- Soniox engine
        await page.evaluate("settings.engine = 'soniox'; saveSettings();")
        await page.click('#recBtn'); await page.wait_for_timeout(2500)
        segs = await page.evaluate("session.segments.slice(-5).map(g => [g.speaker ?? '-', g.text])")
        print('soniox key request access code:', cap['keyreq'], '| config:', json.dumps({k: cap['ws_cfg'][k] for k in ['model', 'audio_format', 'language_hints', 'enable_speaker_diarization', 'enable_endpoint_detection']} if cap['ws_cfg'] else None, ensure_ascii=False))
        print('  context terms (first 6):', (cap['ws_cfg'] or {}).get('context', {}).get('terms', [])[:6], '| audio frames sent:', cap['ws_bin'])
        print('  segments:', json.dumps(segs, ensure_ascii=False))
        await page.click('#tabs [data-tab="form"]')
        await page.screenshot(path=f'{OUT}/soniox-recording.png')
        await page.click('#recBtn'); await page.wait_for_timeout(5200)
        segs2 = await page.evaluate("session.segments.slice(-3).map(g => [g.speaker ?? '-', g.text])")
        print('  after stop (end-of-stream flush):', json.dumps(segs2, ensure_ascii=False), '| eos sent:', cap['ws_text'])
        parts = await page.evaluate("audioParts(session.id).then(ps => ps.map(p => [p.part, p.blob.size]))")
        print('audio parts total:', parts)
        tr = await page.evaluate("buildTranscript(session.segments).split('\\n').slice(-4).join(' | ')")
        print('transcript for the model:', tr)
        await page.screenshot(path=f'{OUT}/side-transcript.png')
        audio_ui = await page.evaluate("$$('#audioBox .audio-part').length")
        print('audio rows in transcript pane:', audio_ui)

        # ---- save to Drive incl. audio
        await page.click('[data-act="finish"]'); await page.wait_for_timeout(1500)
        print('finish view:', await page.evaluate("[view, $$('.vrow').length, $('[data-act=saveDrive]')?.textContent]"))
        await page.click('[data-act="saveDrive"]'); await page.wait_for_timeout(2500)
        print('after save:', await page.evaluate("$('.fin .done')?.textContent.slice(0, 60)"), '| consent in doc:', await page.evaluate("sessionDocHtml(session).includes('הסכמת המטופל להקלטה')"))
        print('drive calls:', [c for c in cap['drive'] if 'upload' in c[1] or 'upload' in c[2]])
        print('audioIds:', await page.evaluate("JSON.stringify(session.audioIds)"))
        await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/after-save.png')

        # ---- settings view
        await page.click('[data-act="resume"] >> nth=-1'); await page.wait_for_timeout(300)
        await page.click('[data-act="settings"]'); await page.wait_for_timeout(200)
        await page.locator('#sEngine').scroll_into_view_if_needed()
        await page.screenshot(path=f'{OUT}/settings-engine.png')
        print('errors:', [e for e in errs if 'favicon' not in e])
        await b.close()
asyncio.run(main())
