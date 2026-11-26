"""End-to-end check of the knowledge base (site + Drive gdoc/docx/pdf, parts, budget, caching)
and of the speech merge in a real browser. All network is mocked."""
import asyncio, json, os, re
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8765/index.html'
OUT = os.path.dirname(os.path.abspath(__file__))
SITE = open('/home/claude/clinic-app/kb/site-snapshot.html', encoding='utf-8').read()
PDF = open('/mnt/user-data/attachments/d2c8df24-38c0-54bc-8dc5-2d84f3963107/79be202e-_______________________________.pdf', 'rb').read()
DOCX = open(f'{OUT}/lesson6.docx', 'rb').read()
B64 = 'iVBORw0KGgo' + 'A' * 400
cap = {'anthropic': [], 'drive': [], 'site': 0}

DOCX_IDS = {'1Qnq6m5gDKvckqx76C1QwntHN6x49Y496', '1daHzXbqlaiBStT5CLSIwlY5nAjaojk0v', '1b_fyv28PrL5X-IhDH14XkiJo7i9dsU5y',
            '1zUknvWbO_UMJhgj0ZYFrefFlM8oy945P', '1FF0nX8mUgek0E7EspDHfmqcWOE9tbM8Q', '1eZYbwtAfj7o2ZMRjeb6fJQ5doWqe3oZH'}
PDF_ID = '17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX'
OLD_DEFAULT = 'https://docs.google.com/document/d/1w69Gy6xERTPrLEa3kJpLsPf4nL0DCDsy_zpxN8VGBvE/edit\nhttps://docs.google.com/document/d/1Tk-9SRI2QJpll-XmWNoviEWIIEhONBtETIQwK49mm3g/edit | ברך'

SSE = [
 {"type": "message_start", "message": {"usage": {"input_tokens": 500, "cache_creation_input_tokens": 90000, "output_tokens": 1}}},
 {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}},
 {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "## סיכום קליני\nבדיקה (מפת דרך — ברך).\n"}},
 {"type": "message_delta", "delta": {"stop_reason": "end_turn"}, "usage": {"output_tokens": 2000}},
 {"type": "message_stop"}]


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
            h = {'content-type': 'application/json', 'access-control-allow-origin': '*'}
            if req.url.endswith('/count_tokens'):
                n = sum(len(c['text']) if isinstance(c, dict) else len(c) for m in body['messages'] for c in (m['content'] if isinstance(m['content'], list) else [m['content']]))
                return await route.fulfill(status=200, headers=h, body=json.dumps({'input_tokens': n // 2}))
            cap['anthropic'].append(body)
            data = ''.join(f"event: {e['type']}\ndata: {json.dumps(e, ensure_ascii=False)}\n\n" for e in SSE)
            await route.fulfill(status=200, headers={'content-type': 'text/event-stream', 'access-control-allow-origin': '*'}, body=data)
        await page.route('https://api.anthropic.com/**', anthropic)

        async def site(route):
            cap['site'] += 1
            await route.fulfill(status=200, headers={'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*'}, body=SITE)
        await page.route('https://raw.githubusercontent.com/**', site)

        async def gapi(route):
            req, url = route.request, route.request.url
            cap['drive'].append(url)
            h = {'content-type': 'application/json', 'access-control-allow-origin': '*'}
            m = re.search(r'/files/([A-Za-z0-9_-]{20,})', url)
            fid = m.group(1) if m else None
            if fid and 'fields=name,mimeType,modifiedTime' in url:
                mt = 'application/pdf' if fid == PDF_ID else ('application/vnd.openxmlformats-officedocument.wordprocessingml.document' if fid in DOCX_IDS else 'application/vnd.google-apps.document')
                name = 'מאגר_מבדקים.pdf' if fid == PDF_ID else (f'סיכום {fid[:4]}.docx' if fid in DOCX_IDS else f'סיכום שיעור {fid[:4]}')
                return await route.fulfill(status=200, headers=h, body=json.dumps({'name': name, 'mimeType': mt, 'modifiedTime': '2026-08-01T00:00:00Z'}))
            if fid and '/export' in url:
                txt = f'# סיכום {fid[:4]}\n\nLachman ו-Pivot shift לברך. ![][image1]\n\n[image1]: <data:image/png;base64,{B64}>\n'
                return await route.fulfill(status=200, headers={'content-type': 'text/markdown', 'access-control-allow-origin': '*'}, body=txt)
            if fid and 'alt=media' in url:
                if fid == PDF_ID:
                    return await route.fulfill(status=200, headers={'content-type': 'application/pdf', 'access-control-allow-origin': '*'}, body=PDF)
                return await route.fulfill(status=200, headers={'content-type': 'application/octet-stream', 'access-control-allow-origin': '*'}, body=DOCX)
            if '?q=' in url:
                return await route.fulfill(status=200, headers=h, body=json.dumps({'files': [{'id': 'ROOT', 'name': 'מטופלים'}]}))
            await route.fulfill(status=200, headers=h, body=json.dumps({'id': 'X', 'trashed': False}))
        await page.route('https://www.googleapis.com/**', gapi)
        await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=
            "window.google={accounts:{oauth2:{initTokenClient:function(o){return {requestAccessToken:function(){setTimeout(function(){o.callback({access_token:'tok',expires_in:3600})},10)}}}}}};"))
        await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))

        # a v1 user: old two-line default list, no kbVer, plus a stale localStorage cache
        await page.add_init_script(f"""
          if (!sessionStorage.getItem('seeded')) {{
            sessionStorage.setItem('seeded', '1');
            localStorage.setItem('ca.settings', JSON.stringify({{apiKey:'sk-test', clientId:'cid.apps.googleusercontent.com', autoFill:false, kbDocs:{json.dumps(OLD_DEFAULT)}}}));
            localStorage.setItem('ca.kbcache', JSON.stringify({{x:{{text:'old'}}}}));
          }}
          window.__recs=[];
          window.webkitSpeechRecognition = window.SpeechRecognition = function(){{ this.start=function(){{window.__recs.push(this)}}; this.stop=function(){{ this.onend && this.onend() }}; }};
        """)
        await page.goto(APP)
        await page.wait_for_timeout(300)
        mig = await page.evaluate("[settings.kbVer, settings.kbDocs === KB_DEFAULT, localStorage.getItem('ca.kbcache'), settings.siteKB, settings.kbBudget]")
        print('migration [kbVer, newDefault, oldCacheGone(None), siteKB, budget]:', mig)

        # ---------- speech merge in the browser ----------
        await page.fill('#pName', 'בדיקה')
        await page.select_option('#pRegion', 'ברך')
        await page.check('#pConsent')
        await page.click('[data-act="start"]')
        await page.wait_for_timeout(200)
        await page.click('#recBtn')
        await page.wait_for_timeout(100)
        seg = await page.evaluate("""async () => {
          const mk = (arr) => ({results: arr.map(([t,f]) => Object.assign([{transcript:t}], {isFinal:f}))});
          let r = window.__recs[window.__recs.length-1];
          // 1. Chrome Android: each event re-sends all finals, cumulative
          r.onresult(mk([['הכאב התחיל', false]]));
          r.onresult(mk([['הכאב התחיל לפני שבועיים', true]]));
          r.onresult(mk([['הכאב התחיל לפני שבועיים', true], ['הכאב התחיל לפני שבועיים במשחק כדורגל', true]]));
          r.onresult(mk([['הכאב התחיל לפני שבועיים', true], ['הכאב התחיל לפני שבועיים במשחק כדורגל', true], ['הברך התנפחה אחרי שעתיים', true]]));
          // 2. same final delivered twice in a row
          r.onresult(mk([['הכאב התחיל לפני שבועיים', true], ['הכאב התחיל לפני שבועיים במשחק כדורגל', true], ['הברך התנפחה אחרי שעתיים', true]]));
          // 3. recognition ends at a pause and restarts; the new session repeats the last words
          r.onend(); await new Promise(z => setTimeout(z, 400));
          r = window.__recs[window.__recs.length-1];
          r.onresult(mk([['התנפחה אחרי שעתיים ומאז יש תחושת בריחה', true]]));
          // 4. revision of the last word in a later cumulative final
          r.onresult(mk([['התנפחה אחרי שעתיים ומאז יש תחושת בריחה', true], ['בירידה במדרגות כואב לי בצד הפנימי', true]]));
          r.onresult(mk([['התנפחה אחרי שעתיים ומאז יש תחושת בריחה', true], ['בירידה במדרגות כואב לי בצד הפנימי של הברך', true]]));
          // 5. real repetition by the speaker, short words — must be kept
          r.onresult(mk([['כן כן', true]]));
          return session.segments.map(s => s.text);
        }""")
        print('segments:')
        for s in seg: print('   ', s)
        full = ' '.join(seg)
        print('dup check — "לפני שבועיים" x', full.count('לפני שבועיים'), '| "שעתיים" x', full.count('שעתיים'), '| "בצד הפנימי" x', full.count('בצד הפנימי'), '| has "של הברך":', 'של הברך' in full, '| "כן כן" kept:', 'כן כן' in full)
        await page.click('#recBtn')
        await page.wait_for_timeout(200)

        # ---------- analysis, region ברך ----------
        await page.click('#tabs [data-tab="analysis"]')
        await page.screenshot(path=f'{OUT}/k1-analysis-before.png')
        await page.click('#analysisBtn')
        for _ in range(60):
            await page.wait_for_timeout(250)
            if any(x.get('stream') for x in cap['anthropic']): break
        await page.wait_for_timeout(600)
        await page.screenshot(path=f'{OUT}/k2-analysis-done.png', full_page=True)
        body = [x for x in cap['anthropic'] if x.get('stream')][-1]
        c0 = body['messages'][0]['content'][0]
        kb = c0['text']
        titles = re.findall(r'<document title="([^"]+)"', kb)
        print('analysis KB docs:', titles)
        print('cache_control on KB block:', c0.get('cache_control'), '| KB chars:', len(kb))
        print('site part: general framework', '## מסגרת כללית' in kb, '| no region chapter for knee (expected note):', 'אין עדיין פרק באתר' in kb)
        print('compendium part ה (knee) present:', 'חלק ה' in kb and 'Lachman' in kb, '| part ו (ankle) absent:', 'חלק ו׳ — קרסול וכף רגל\n' not in kb and 'Anterior Drawer' not in kb.split('חלק ה')[-1][:0])
        comp = [t for t in titles if 'מאגר' in t]
        print('compendium entries:', comp)
        print('base64 stripped:', 'base64' not in kb and B64[:20] not in kb)
        print('docx parsed (table row):', '| FADIR | רגישות גבוהה ל-FAI |' in kb, '| bullets:', '- Thomas test' in kb)
        print('status:', (await page.inner_text('#analysisStatus'))[:300])
        print('session.analysisKB:', await page.evaluate('session.analysisKB.length'))

        # ---------- the compendium split, inspected directly ----------
        info = await page.evaluate("""async () => {
          const c = await kbGet('doc:17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX');
          const pick = (ps) => pickParts(c.text, ps);
          const sizes = {}; for (const L of ['א','ב','ג','ד','ה','ו','ז','ח']) { const r = pick(['חלק ' + L]); sizes[L] = [r.text.length, r.text.split('\\n')[0].slice(0,40)]; }
          return { total: c.text.length, sizes, missing: pick(['חלק ט']).missing };
        }""")
        print('compendium total chars:', info['total'])
        for k, v in info['sizes'].items(): print('   part', k, v)
        print('   missing part ט reported:', info['missing'])

        # ---------- second analysis: cache hit, no Drive re-reads ----------
        n_drive = len(cap['drive'])
        await page.click('#analysisBtn')
        for _ in range(40):
            await page.wait_for_timeout(250)
            if len([x for x in cap['anthropic'] if x.get('stream')]) >= 2: break
        print('second analysis: new Drive calls =', len(cap['drive']) - n_drive, '| site fetches total =', cap['site'])

        # ---------- shoulder: site chapter ----------
        rt = await page.evaluate("""async () => { const kb = await loadKB('כתף'); return { titles: kb.docs.map(d => d.title), chars: kb.chars, hasChapter: kb.docs[0].text.includes('## ') && kb.docs[0].text.includes('כרטיסי מבדקים'), problems: kb.problems }; }""")
        print('shoulder KB:', json.dumps(rt, ensure_ascii=False)[:600])

        # ---------- budget ----------
        bud = await page.evaluate("""async () => { settings.kbBudget = 60; const kb = await loadKB('ברך'); settings.kbBudget = 350; return { chars: kb.chars, n: kb.docs.length, problems: kb.problems }; }""")
        print('budget 60K:', json.dumps(bud, ensure_ascii=False)[:500])

        # ---------- settings: refresh & per-region table ----------
        await page.click('[data-act="settings"]')
        await page.wait_for_timeout(200)
        await page.click('[data-act="refreshKb"]')
        for _ in range(80):
            await page.wait_for_timeout(250)
            if await page.query_selector('#kbStatus table.kbt'): break
        await page.wait_for_timeout(200)
        await page.locator('#kbStatus').scroll_into_view_if_needed()
        await page.screenshot(path=f'{OUT}/k3-settings-kb.png', full_page=True)
        print('kb status table rows:', await page.evaluate("$$('#kbStatus table.kbt tr').length"))
        print('kb status text head:', (await page.inner_text('#kbStatus'))[:900])

        # ---------- GitHub down → snapshot / cache fallback ----------
        await page.unroute('https://raw.githubusercontent.com/**')
        await page.route('https://raw.githubusercontent.com/**', lambda r: r.fulfill(status=503, body='down'))
        fb = await page.evaluate("""async () => { await caches.delete(KB_CACHE); kbMem.clear(); const s = await loadSite(true); return [s.src, !!s.stale, s.data.REGIONS.length]; }""")
        print('GitHub down, empty cache → ', fb)
        print('scrollWidth:', await page.evaluate('document.documentElement.scrollWidth'))
        print('ERRORS:', errors)
        await b.close()
asyncio.run(main())
