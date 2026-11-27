"""Layout tour for the round of 27.11 (top bar, player, card grid, transcript panel): phone 390/412, tablet, desktop 1280/1440/1920,
light / comfort / dark, recording on, player open. Writes screenshots to ui/<TAG>-*.png and prints layout measurements.
Run with TAG=before against an older commit on 8767 for the before screenshots."""
import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
TAG = os.environ.get('TAG', 'after'); O = os.path.join(HERE, 'ui'); os.makedirs(O, exist_ok=True)
SIZES = [('p390', 390, 844), ('p412', 412, 915), ('tab', 1240, 860), ('d1280', 1280, 800), ('d1440', 1440, 900), ('d1920', 1920, 1080)]
THEMES = os.environ.get('THEMES', 'comfort').split(',')
SETUP = """(() => {
  recording = true; renderSession();
  const t = $('#timer'); if (t) t.textContent = '00:32';
  const st = $('#recState'); if (st) st.textContent = 'אנמנזה';
  const cap = $('#islCap'); if (cap) { cap.classList.remove('idle'); cap.innerHTML = '<span class="k">עוצמת כאב מירבית: </span>4-5 (לפעמים)'; }
  const bd = $('#islBadge'); if (bd) { bd.hidden = false; bd.innerHTML = '2<span class="bl"> לאימות</span>'; }
  PL.audio = new Audio(); PL.seg = 1; PL.part = 2; renderPlayer();
  return 0; })()"""
MEASURE = """(() => { const r = s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const cards = [...document.querySelectorAll('#vizGrid > section.card')].map(c => { const b = c.getBoundingClientRect(); return [c.querySelector('h2')?.textContent, Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; });
  return { back: r('.toolbar .back'), island: r('#island'), tools: r('.toolbar .trail .capsule'), timer: (() => { const t = $('#timer'); if (!t) return null; return [t.scrollWidth, t.clientWidth, Math.round(t.getBoundingClientRect().left), Math.round($('#island').getBoundingClientRect().left)]; })(),
    player: r('#player'), plMain: r('#player button[data-act=plToggle]'), notebar: r('#noteBar .notebar'), cards }; })()"""
async def run(b, name, w, h, theme):
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(6000)
    await page.evaluate(f"localStorage.setItem('uqmap-theme', '{theme}'); setTheme && setTheme('{theme}')")
    await page.evaluate(SEED); await page.wait_for_timeout(500)
    await page.evaluate("applyInsight(session, %s, ['body'], [], null); saveSession(true)" % json.dumps({'body': INSIGHT['body']}, ensure_ascii=False)); await page.wait_for_timeout(200)
    await page.evaluate("tab='live'; render()"); await page.wait_for_timeout(400)
    await page.evaluate(SETUP); await page.wait_for_timeout(700)
    m = await page.evaluate(MEASURE)
    p(f'{name} {theme}:', json.dumps(m, ensure_ascii=False))
    await page.screenshot(path=f'{O}/{TAG}-{name}-{theme}.png')
    await page.screenshot(path=f'{O}/{TAG}-{name}-{theme}-top.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 110})
    if name in ('p390', 'd1440'):
        await page.evaluate("[...document.querySelectorAll('[data-act=trOpen]')].find(b => b.offsetParent)?.click(); 0"); await page.wait_for_timeout(500)
        side = page.locator('#sidePane')
        if await side.count(): await side.screenshot(path=f'{O}/{TAG}-{name}-{theme}-transcript.png')
        await page.evaluate("trOpenNarrow = false; view = 'finish'; renderFinish(); renderPlayer(); 0"); await page.wait_for_timeout(700)
        p(f'{name} finish cards:', await page.evaluate("JSON.stringify([...document.querySelectorAll('.fin div.grid > section.card')].map(c => { const b = c.getBoundingClientRect(); return [c.querySelector('h2')?.textContent, Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }))"), '| player:', await page.evaluate("JSON.stringify((r => r && [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)])($('#player')?.getBoundingClientRect()))"))
        await page.screenshot(path=f'{O}/{TAG}-{name}-{theme}-finish.png')
    if page._errs: p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for th in THEMES:
            for name, w, h in SIZES: await run(b, name, w, h, th)
        await b.close()
asyncio.run(main())
