"""Saved sessions in Drive: data file, amendments, 24 h lock with addenda, patients screen, reopen, follow-up."""
import asyncio, json, os, re, time, urllib.parse
os.environ['DPR'] = '1'
exec(open('run25.py').read().split('async def main')[0])
O = os.path.join(HERE, 'p6'); os.makedirs(O, exist_ok=True)
STATE['signed'] = True
FILES = {}; SEQ = [0]
def new_id(): SEQ[0] += 1; return f'f{SEQ[0]:04d}xxxxxxxxxxxxxxxxxxxx'
def parse_multipart(body):
    parts = re.split(r'--\S+\r\n', body)
    meta = json.loads(parts[1].split('\r\n\r\n', 1)[1].rsplit('\r\n', 1)[0])
    content = parts[2].split('\r\n\r\n', 1)[1].rsplit('\r\n--', 1)[0]
    return meta, content
def matches(f, q):
    if 'trashed=false' in q and f.get('trashed'): return False
    m = re.search(r"appProperties has \{ key='ca' and value='(\w+)' \}", q)
    if m and (f.get('appProperties') or {}).get('ca') != m.group(1): return False
    m = re.search(r"'([^']+)' in parents", q)
    if m and m.group(1) not in f.get('parents', []): return False
    m = re.search(r"mimeType='([^']+)'", q)
    if m and f.get('mimeType') != m.group(1): return False
    m = re.search(r"name contains '([^']+)'", q)
    if m and m.group(1) not in f['name']: return False
    m = re.search(r"name='((?:[^'\\]|\\.)*)'", q)
    if m and f['name'] != m.group(1).replace("\\'", "'"): return False
    return True
async def drive(route):
    req = route.request; u = req.url; m = req.method
    path = urllib.parse.urlparse(u).path; qs = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
    ok = lambda obj, **kw: route.fulfill(status=200, content_type='application/json', body=json.dumps(obj), **kw)
    if '/upload/drive/v3/files' in path:
        fid = path.rsplit('/files', 1)[1].strip('/') or None
        if qs.get('uploadType') == ['resumable']:
            meta = json.loads(req.post_data or '{}'); fid = fid or new_id()
            FILES.setdefault(fid, {'id': fid, 'parents': meta.get('parents', []), 'mimeType': meta.get('mimeType')}).update({'name': meta.get('name', FILES.get(fid, {}).get('name'))})
            return await route.fulfill(status=200, headers={'Location': f'https://www.googleapis.com/upload/put/{fid}', 'content-type': 'application/json'}, body='{}')
        meta, content = parse_multipart(req.post_data)
        if fid and fid in FILES: FILES[fid].update({k: v for k, v in meta.items()}); FILES[fid]['content'] = content
        else: fid = new_id(); FILES[fid] = {'id': fid, **meta, 'content': content}
        FILES[fid]['modifiedTime'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
        if FILES[fid].get('mimeType') == 'application/vnd.google-apps.document': FILES[fid]['webViewLink'] = f'https://docs.google.com/document/d/{fid}/edit'
        return await ok({'id': fid})
    if '/upload/put/' in path:
        fid = path.rsplit('/', 1)[1]; FILES[fid]['content'] = req.post_data_buffer; return await ok({'id': fid})
    if path.endswith('/drive/v3/files') and m == 'GET':
        q = qs.get('q', [''])[0]
        if 'appDataFolder' in u: return await ok({'files': []})
        return await ok({'files': [{k: v for k, v in f.items() if k != 'content'} for f in FILES.values() if matches(f, q)]})
    if path.endswith('/drive/v3/files') and m == 'POST':
        meta = json.loads(req.post_data or '{}'); fid = new_id(); FILES[fid] = {'id': fid, **meta}; return await ok({'id': fid})
    m2 = re.search(r'/drive/v3/files/([^/?]+)$', path)
    if m2:
        f = FILES.get(urllib.parse.unquote(m2.group(1)))
        if not f: return await route.fulfill(status=404, content_type='application/json', body='{"error":{"message":"not found"}}')
        if qs.get('alt') == ['media']:
            c = f.get('content', '')
            return await route.fulfill(status=200, content_type=f.get('mimeType') or 'application/json', body=c if isinstance(c, (bytes, str)) else '')
        return await ok({'id': f['id'], 'trashed': False})
    await route.fulfill(status=404, body='{}')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, page = await mk(b, settings="{autoFill:false, kbVer:2, siteKB:true}")
        await page.route('https://www.googleapis.com/**', drive)
        # an older session saved as a document only (before data files)
        FILES['root'] = {'id': 'root', 'name': 'מטופלים', 'mimeType': 'application/vnd.google-apps.folder', 'appProperties': {'ca': 'root'}}
        FILES['pf1'] = {'id': 'pf1', 'name': 'רועי לוי', 'mimeType': 'application/vnd.google-apps.folder', 'parents': ['root'], 'appProperties': {'ca': 'patient'}}
        FILES['old1xxxxxxxxxxxxxxxxxxxxx'] = {'id': 'old1xxxxxxxxxxxxxxxxxxxxx', 'name': 'מפגש 2026-10-20 10:00 — רועי לוי', 'mimeType': 'application/vnd.google-apps.document', 'parents': ['pf1'], 'webViewLink': 'https://docs.google.com/document/d/old1/edit', 'modifiedTime': '2026-10-20T08:00:00Z'}
        await page.evaluate(SEED); await page.wait_for_timeout(300); await page.evaluate(EXAM); await page.wait_for_timeout(300)
        await page.evaluate("openFinish()"); await page.wait_for_timeout(800)
        print('warning before first save:', await page.evaluate("$('.banner.amend')?.textContent.slice(0, 60)"))
        await page.screenshot(path=f'{O}/1-finish-warning.png', full_page=True)
        await page.click('[data-act=saveDrive]'); await page.wait_for_timeout(1500)
        s = await page.evaluate("({ json: session.jsonId, first: !!session.firstSavedAt, snap: Object.keys(session.savedSnap || {}).length, amend: (session.amendments || []).length })")
        jf = FILES.get(s['json'], {}); print('first save:', s, '| data file:', jf.get('name'), jf.get('appProperties', {}).get('ca'), '| parents', jf.get('parents'))
        doc = next(f for f in FILES.values() if f.get('mimeType') == 'application/vnd.google-apps.document' and 'old1' not in f['id'] and f['name'].startswith('מפגש'))
        print('doc says first saved:', 'נשמר לראשונה' in doc['content'], '| no amendments yet:', 'תיקונים אחרי' not in doc['content'])
        # amend within 24 h
        await page.click('[data-act=resume]'); await page.wait_for_timeout(400)
        print('editable banner:', await page.evaluate("!!$('.ptitle ~ .banner.amend, .banner.amend')"))
        await page.evaluate("session.fields.aggravating = { value: 'הרמת היד מעל הראש וזריקה', source: 'manual', locked: true }; session.changedAt = Date.now(); saveSession(true)")
        await page.evaluate("openFinish()"); await page.wait_for_timeout(800)
        print('finish note:', await page.evaluate("$$('.muted.small').map(p => p.textContent).find(t => /מאז השמירה/.test(t))"))
        await page.click('[data-act=saveDrive]'); await page.wait_for_timeout(1500)
        doc = FILES[doc['id']]
        print('amendment logged:', await page.evaluate("session.amendments.map(a => a.changes.map(c => c.label + ': ' + c.from + ' → ' + c.to))"), '| in doc:', 'תיקונים אחרי השמירה הראשונה' in doc['content'])
        # patients screen
        await page.click('[data-act=resume]'); await page.wait_for_timeout(300); await page.click('[data-act=home]'); await page.wait_for_timeout(300)
        await page.click('.capsule [data-act=records]'); await page.wait_for_timeout(1200)
        print('patients screen:', await page.evaluate("$$('#recList .card h2').map(h => h.textContent)"), '| rows:', await page.evaluate("$$('#recList li .grow span').map(x => x.textContent.trim())"))
        await page.screenshot(path=f'{O}/2-patients.png', full_page=True)
        await page.fill('#recQ', 'אין כזה'); await page.wait_for_timeout(200); print('search empty:', await page.evaluate("$('#recList').textContent.trim()"))
        await page.fill('#recQ', 'רועי'); await page.wait_for_timeout(200)
        # close the local copy, reopen from Drive
        await page.evaluate("audioDelete(session.id); session = null; saveSession(true)")
        await page.click('[data-act=openRec]'); await page.wait_for_timeout(1200)
        print('reopened:', await page.evaluate("[view, tab, session?.patientName, session?.fields?.aggravating?.value, session?.amendments?.length, session?.segments?.length]"))
        await page.screenshot(path=f'{O}/3-reopened-summary.png')
        # 24 h later: locked, addenda only
        await page.evaluate("session.firstSavedAt = Date.now() - 25 * 3600e3; saveSession(true); render()"); await page.wait_for_timeout(400)
        print('locked view:', await page.evaluate("!!$('.banner.lockd') && !!$('#addText') && !$('#tabBody')"))
        await page.fill('#addText', 'MRI מ-03.11: קרע חלקי ב-supraspinatus'); await page.click('[data-act=addendum]'); await page.wait_for_timeout(1500)
        doc = FILES[doc['id']]
        print('addendum saved:', await page.evaluate("session.addenda.length"), '| in doc:', 'נספחים' in doc['content'] and 'supraspinatus' in doc['content'], '| amendments unchanged:', await page.evaluate("session.amendments.length"))
        await page.screenshot(path=f'{O}/4-locked.png', full_page=True)
        await page.click('[data-act=closeRecord]'); await page.wait_for_timeout(500)
        print('after close:', await page.evaluate("[view, !!session]"))
        # follow-up for the same patient gets the previous session
        await page.click('[data-act=home]'); await page.wait_for_timeout(300)
        await page.evaluate("""() => { $('#pName').value = 'רועי לוי'; $('#pRegion').value = 'כתף'; setPType('מפגש מעקב'); $('#pConsent').checked = true; }""")
        await page.click('[data-act=start]'); await page.wait_for_timeout(1500)
        print('follow-up prev:', await page.evaluate("[!!session.prev, session.prev?.fields?.aggravating, !!$('details.prev')]"))
        await page.evaluate("$('details.prev').open = true"); await page.wait_for_timeout(200)
        await page.screenshot(path=f'{O}/5-followup.png')
        errs += page._errs; await ctx.close()
        ctx, page = await mk(b, 390, 844, theme='dark'); await page.route('https://www.googleapis.com/**', drive)
        await page.evaluate("go('records'); loadRecords()"); await page.wait_for_timeout(1200); await page.screenshot(path=f'{O}/6-patients-390-dark.png', full_page=True)
        errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
