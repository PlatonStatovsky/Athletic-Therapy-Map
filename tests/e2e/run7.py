"""Play a transcript line from the saved recording: line timing (browser engine and Soniox start_ms),
seek into the MediaRecorder file, player bar, follow-along highlight, block while recording, position in the Drive doc."""
import asyncio, json, os
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8766/app/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'p')
os.makedirs(OUT, exist_ok=True)

async def soniox_ws(ws):
    def on_msg(m):
        if isinstance(m, (bytes, bytearray)): return
        if m == '':
            ws.send(json.dumps({"tokens": [], "finished": True})); asyncio.get_event_loop().create_task(ws.close()); return
        asyncio.get_event_loop().create_task(later())
    async def later():  # tokens come back after the words were spoken
        await asyncio.sleep(5)
        ws.send(json.dumps({"tokens": [{"text": "איפה", "is_final": True, "speaker": "1", "start_ms": 1200, "end_ms": 1500},
                                       {"text": " כואב", "is_final": True, "speaker": "1", "start_ms": 1500, "end_ms": 1900},
                                       {"text": "?", "is_final": True, "speaker": "1", "start_ms": 1900, "end_ms": 1950},
                                       {"text": "בכתף", "is_final": True, "speaker": "2", "start_ms": 3400, "end_ms": 3900},
                                       {"text": " ימין", "is_final": True, "speaker": "2", "start_ms": 3900, "end_ms": 4300},
                                       {"text": "<end>", "is_final": True}]}))
    ws.on_message(on_msg)

EMIT = """([text, final]) => { const r = window.__recs[window.__recs.length-1];
  const prev = window.__finals || [];
  const results = prev.map(t => Object.assign([{transcript: t}], {isFinal: true}));
  results.push(Object.assign([{transcript: text}], {isFinal: final}));
  if (final) window.__finals = [...prev, text];
  r.onresult({results}); }"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'])
        for (w, h, tag) in [(360, 780, "phone")]:
            ctx = await b.new_context(viewport={'width': w, 'height': h}, locale='he-IL', permissions=['microphone'], device_scale_factor=1.5)
            page = await ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
            page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
            await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
            await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
            await page.route('**/api/soniox-key', lambda r: r.fulfill(status=200, headers={'content-type': 'application/json'}, body='{"api_key":"tmp"}'))
            await page.route_web_socket('wss://stt-rt.soniox.com/**', soniox_ws)
            await page.add_init_script("""
              localStorage.setItem('ca.settings', JSON.stringify({apiKey:'sk', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, saveAudio:true, engine:'browser', accessCode:'c', continuous:true}));
              window.__recs=[];
              window.webkitSpeechRecognition = window.SpeechRecognition = function(){ this.start=function(){window.__recs.push(this); this.onstart && this.onstart()}; this.stop=function(){ this.onend && this.onend() }; this.abort=function(){ this.onend && this.onend() }; };
            """)
            await page.goto(APP); await page.wait_for_timeout(300)
            await page.fill('#pName', 'בדיקה'); await page.select_option('#pRegion', 'כתף'); await page.check('#pConsent')
            await page.click('[data-act="start"]'); await page.wait_for_timeout(200)
            if not await page.evaluate("wide"): await page.click('#tabs [data-tab="transcript"]')

            # ---- browser engine: three lines at known moments
            await page.click('#recBtn'); await page.wait_for_timeout(1000)
            await page.evaluate(EMIT, ['מה מביא', False]); await page.wait_for_timeout(1500)
            await page.evaluate(EMIT, ['מה מביא אותך היום', True]); await page.wait_for_timeout(3500)
            await page.evaluate(EMIT, ['כאב בכתף', False]); await page.wait_for_timeout(1000)
            await page.evaluate(EMIT, ['כאב בכתף ימין כבר חודש', True]); await page.wait_for_timeout(4000)
            await page.evaluate(EMIT, ['בדקנו', False]); await page.wait_for_timeout(800)
            await page.evaluate(EMIT, ['בדקנו Hawkins Kennedy חיובי', True]); await page.wait_for_timeout(1500)
            # ▶ while recording is refused
            await page.click('.seg[data-i="1"] .seg-play'); await page.wait_for_timeout(200)
            print(tag, 'while recording →', await page.evaluate("document.querySelector('#toastHost')?.innerText"))
            await page.click('#recBtn'); await page.wait_for_timeout(1500)
            info = await page.evaluate("""() => { const s = session; const st = s.audioStarts[1];
              return { start: st, end: s.audioEnds?.[1] - st, lines: s.segments.map(g => [g.text, g.t0 - st, g.t - st]), buttons: $$('.seg-play').length }; }""")
            print(tag, 'part 1 length ms:', info['end'], '| play buttons:', info['buttons'])
            for l in info['lines']: print('   line', json.dumps(l, ensure_ascii=False))

            # ---- play line 2 (index 1)
            await page.click('.seg[data-i="1"] .seg-play'); await page.wait_for_timeout(700)
            st = await page.evaluate("({ct: PL.audio.currentTime, dur: PL.audio.duration, paused: PL.audio.paused, bar: !$('#player').hidden, playing: $$('.seg.playing').map(e => e.dataset.i), time: $('#plTime').textContent})")
            exp = info['lines'][1][1] / 1000 - 1.5
            print(tag, 'play line 2: currentTime %.2f (expected ≈ %.2f + ~0.7 played) | duration %.1f | paused %s | bar %s | highlighted %s | %s' % (st['ct'], exp, st['dur'], st['paused'], st['bar'], st['playing'], st['time']))
            await page.screenshot(path=f'{OUT}/{tag}-playing.png')
            # +5 seconds → highlight follows to line 3
            await page.click('[data-act="plSeek"][data-d="5"]'); await page.wait_for_timeout(900)
            st2 = await page.evaluate("({ct: PL.audio.currentTime, playing: $$('.seg.playing').map(e => e.dataset.i)})")
            print(tag, 'after +5: currentTime %.2f | highlighted %s' % (st2['ct'], st2['playing']))
            await page.click('[data-act="plToggle"]'); await page.wait_for_timeout(200)
            print(tag, 'pause → paused:', await page.evaluate("PL.audio.paused"))
            # line 1 from the start of the part
            await page.click('.seg[data-i="0"] .seg-play'); await page.wait_for_timeout(300)
            print(tag, 'play line 1: currentTime %.2f' % await page.evaluate("PL.audio.currentTime"))
            # position in the transcript document
            doc = await page.evaluate("transcriptDocHtml(session).match(/\\[[^\\]]*\\]/g).slice(0, 3)")
            print(tag, 'Drive transcript lines:', json.dumps(doc, ensure_ascii=False))

            # ---- Soniox: line start from the token's start_ms
            await page.click('[data-act="plClose"]')
            await page.evaluate("settings.engine = 'soniox'; saveSettings();")
            await page.click('#recBtn'); await page.wait_for_timeout(6500)
            sx = await page.evaluate("session.segments.slice(-2).map(g => [g.speaker, g.text, g.t0 - STT.connAt])")
            print(tag, 'soniox lines (speaker, text, t0 - connection start):', json.dumps(sx, ensure_ascii=False))
            await page.click('#recBtn'); await page.wait_for_timeout(5000)
            parts = await page.evaluate("audioParts(session.id).then(ps => ps.map(p => [p.part, p.blob.size]))")
            print(tag, 'audio parts:', parts, '| audio box players seekable:', await page.evaluate("$$('#audioBox audio').map(a => a.duration).join(',')"))
            await page.click(f'.seg[data-i="{len(info["lines"]) + 1}"] .seg-play'); await page.wait_for_timeout(500)
            st3 = await page.evaluate("({part: PL.part, ct: PL.audio.currentTime, playing: $$('.seg.playing').map(e => e.dataset.i)})")
            print(tag, 'play soniox line 2 →', st3, '| expected ≈ %.2f + played' % ((sx[1][2] + await page.evaluate("STT.connAt - session.audioStarts[2]")) / 1000 - 1.5))
            await page.screenshot(path=f'{OUT}/{tag}-soniox-play.png')
            # leaving the session stops the player
            await page.click('[data-act="home"]'); await page.wait_for_timeout(200)
            print(tag, 'after leaving: player hidden', await page.evaluate("!PL.audio && (!$('#player') || $('#player').hidden)"))
            print(tag, 'errors:', [e for e in errs if 'favicon' not in e])
            await ctx.close()
        await b.close()
asyncio.run(main())
