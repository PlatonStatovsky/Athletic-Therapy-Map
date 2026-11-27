"""Map on narrow phones (360/375/384/412) at text sizes 1, 1.1, 1.2: nothing sticks out sideways — page, regions sheet, tests sheet, display sheet. Prints OK or the offending elements."""
import asyncio, os
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766')
from playwright.async_api import async_playwright
CHK = """(() => { const W = document.documentElement.clientWidth; const out = [];
  document.querySelectorAll('body *').forEach(e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    if (!b.width || cs.visibility === 'hidden' || e.closest('[hidden]')) return;
    const sh = e.closest('#side,#panel'); if (sh && getComputedStyle(sh).visibility === 'hidden') return;
    if (b.left < -1 || b.right > W + 1) out.push((e.id||e.className||e.tagName).toString().slice(0,24) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
  return { sw: document.documentElement.scrollWidth, W, out: out.slice(0,6) }; })()"""
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for w in (360, 375, 384, 412):
          for fs in ('1','1.1','1.2'):
            ctx = await b.new_context(viewport={'width':w,'height':840}, device_scale_factor=3, is_mobile=True, has_touch=True)
            await ctx.add_init_script(f"localStorage.setItem('uqmap-fs','{fs}')")
            pg = await ctx.new_page(); await pg.goto(BASE + '/map/#general'); await pg.wait_for_timeout(1000)
            res = [await pg.evaluate(CHK)]
            for k in ('regions','tests','disp'):
                await pg.click(f'[data-mbar={k}]'); await pg.wait_for_timeout(500); res.append(await pg.evaluate(CHK))
                pass
                await pg.keyboard.press('Escape'); await pg.click('[data-mbar=regions]') if False else None
                await pg.evaluate("document.querySelectorAll('#side.shown,#panel.shown,#disp.open').forEach(e=>e.classList.remove('shown','open')); document.querySelector('#scrim').hidden=true")
            
            bad = [r for r in res if r['out'] or r['sw'] > r['W']]
            print(w, fs, 'OK' if not bad else bad); await ctx.close()
        await b.close()
asyncio.run(main())
