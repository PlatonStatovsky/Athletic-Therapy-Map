"""Recording limit per session: at most 10 recordings and 2 hours in total; no cap on a single recording.
The 11th press does nothing and the button is grey (title + aria-label, no message); at 2 hours a running recording stops by itself;
the clock is orange in the last 5 minutes; older sessions count their recorded parts. Soniox start/stop are stubbed (no microphone here)."""
import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'reclimit'); os.makedirs(O, exist_ok=True)
BTN = "(() => { const b = $('#recBtn'); return { disabled: b.disabled, title: b.title, aria: b.getAttribute('aria-label') }; })()"
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(6000)
    await page.evaluate(SEED); await page.wait_for_timeout(400)
    await page.evaluate("""settings.engine = 'soniox'; sonioxStart = async () => {}; sonioxStop = () => {}; openMic = async () => null; startSaver = () => {};
      delete session.recStarts; session.audioParts = 0; session.recordedMs = 0; tab = 'live'; render(); 0""")
    await page.wait_for_timeout(300)
    starts = []
    for i in range(11):
        await page.evaluate("startRec()"); await page.wait_for_timeout(60)
        starts.append(await page.evaluate("[recording, session.recStarts]"))
        await page.evaluate("recording && stopRec()"); await page.wait_for_timeout(60)
    p('presses 1..11 → [recording, recStarts]:', starts)
    p('after 10 recordings, button:', await page.evaluate(BTN), '| toasts:', await page.evaluate("document.querySelectorAll('.toast').length"))
    await page.locator('#island').screenshot(path=f'{O}/{tag}-full10.png')
    # long recordings: no per-recording cap; 2 hours in total stops it
    await page.evaluate("session.recStarts = 3; session.recordedMs = 0; renderRecState(); 0")
    await page.evaluate("startRec(); recSince = Date.now() - 40 * 60e3; tickTimer(); 0")
    p('one 40-minute recording still running:', await page.evaluate("recording"), '| timer:', await page.evaluate("$('#timer').textContent"))
    await page.evaluate("stopRec(); 0"); await page.wait_for_timeout(50)
    await page.evaluate("startRec(); recSince = Date.now() - (2 * 3600e3 - 40 * 60e3 - 3 * 60e3); tickTimer(); 0"); await page.wait_for_timeout(50)
    await page.wait_for_timeout(700)
    p('3 minutes before 2h: recording', await page.evaluate("recording"), '| clock:', await page.evaluate("$('#timer').textContent"), '| clock orange:', await page.evaluate("$('#timer').classList.contains('warn')"), '| colour:', await page.evaluate("getComputedStyle($('#timer')).color"))
    await page.locator('#island').screenshot(path=f'{O}/{tag}-warn.png')
    await page.evaluate("recSince = Date.now() - (2 * 3600e3 - 40 * 60e3); tickTimer(); 0"); await page.wait_for_timeout(100)
    p('at 2h: recording stopped:', not await page.evaluate("recording"), '| total ms:', await page.evaluate("session.recordedMs"), '| button:', await page.evaluate(BTN))
    await page.evaluate("startRec()"); await page.wait_for_timeout(60)
    p('press after 2h:', await page.evaluate("recording"), '| starts unchanged:', await page.evaluate("session.recStarts"))
    # older session without recStarts: its saved parts count
    await page.evaluate("delete session.recStarts; session.recordedMs = 0; session.audioParts = 10; renderSession(); 0"); await page.wait_for_timeout(200)
    p('older session with 10 parts:', await page.evaluate(BTN))
    await page.evaluate("session.audioParts = 2; renderSession(); 0"); await page.wait_for_timeout(200)
    p('older session with 2 parts:', await page.evaluate(BTN))
    # settings › transcription
    await page.evaluate("openSettings('stt')"); await page.wait_for_timeout(500)
    p('settings line:', await page.evaluate("[...document.querySelectorAll('.gi .t')].map(e => e.textContent).find(t => t.includes('הקלטות במפגש'))"))
    await page.screenshot(path=f'{O}/{tag}-settings.png')
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
