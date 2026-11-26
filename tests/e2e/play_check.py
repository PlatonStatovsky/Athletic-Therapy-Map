"""Real recorded audio: does ▶ on a verify row play only the quote?"""
import asyncio, json, os, sys
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
REC = """async () => {
  const ac = new AudioContext(); const o = ac.createOscillator(); const d = ac.createMediaStreamDestination(); o.connect(d); o.start();
  startSaver(d.stream); await new Promise(r => setTimeout(r, 16000)); stopSaver(); o.stop();
  await new Promise(r => setTimeout(r, 1200));
  const parts = await audioParts(session.id); const pn = session.audioParts; const st = session.audioStarts[pn];
  console.log('dbg', JSON.stringify(session.audioStarts), pn, parts.map(p => [p.part, p.blob.size]));
  session.segments.forEach((g, i) => { g.t0 = st + 1000 + i * 1300; g.t = g.t0 + 1100; delete g.manual; });
  saveSession(true); return [session.segments.length, pn, JSON.stringify(session.audioStarts), parts.map(p => [p.part, p.blob.size, p.mime])];
}"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx, page = await mkp(b, 1240, 860, 1)
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.evaluate("applyInsight(session, %s, ['record','body','timeline','hypo'], ['complaint','details'], null); session.insDirty = {secs:[], parts:[]}; saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'hypotheses']}, ensure_ascii=False))
        print('segments:', await page.evaluate(REC))
        await finish_from_session(page)
        btn = page.locator('.vrow .vplay, .vrow [data-act=quotePlay], .vrow [data-act=segPlay]').first
        fid = await btn.evaluate("b => b.closest('.vrow').id.slice(2)")
        info = await page.evaluate(f"(() => {{ const v = session.fields['{fid}'], i = findSeg(v.quote), g = session.segments[i], st = session.audioStarts[session.audioParts]; return {{ quote: v.quote, line: g.text, i, lineFrom: (g.t0 - st) / 1000, lineTo: (g.t - st) / 1000 }}; }})()")
        print('row:', fid, info)
        await btn.click()
        for ms in (400, 1500, 3000, 5000):
            await page.wait_for_timeout(ms - (0 if ms == 400 else prev)); prev = ms
            print(f'  t+{ms}ms: currentTime={await page.evaluate("PL.audio && PL.audio.currentTime.toFixed(2)")} paused={await page.evaluate("PL.audio && PL.audio.paused")}')
        print('errors:', page._errs); await b.close()
prev = 400
asyncio.run(main())
