"""Ligamentum map: contrast of text that sits on the region atmosphere (title, lede, meta pills, rail labels, search placeholder, wordmark), measured against the real screenshot pixels behind it, every region × light/comfort/dark × 1440/2000/390. Prints ok/FAIL with the worst case per theme and selector."""
import asyncio, io
from playwright.async_api import async_playwright
from PIL import Image
def lum(c):
    f=lambda v: (v/255)/12.92 if v/255<=.03928 else ((v/255+.055)/1.055)**2.4
    return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])
def ratio(a,b):
    x,y=lum(a),lum(b); return (max(x,y)+.05)/(min(x,y)+.05)
SEL = ['.region-head h2', '.lede', '.meta span', '.reg span:first-child', '.reg .cnt', '.rail-h', '.field input', '.brand h1']
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); worst = {}
        for th in ('light','comfort','dark'):
            for (w,h,mob) in ((1440,900,False),(2000,1100,False),(390,844,True)):
                for reg in ('general','found','tissue','neck','shoulder','elbow','hand','lowback','hip','knee','ankle'):
                    ctx = await b.new_context(viewport={'width':w,'height':h}, is_mobile=mob, has_touch=mob)
                    await ctx.add_init_script(f"localStorage.setItem('uqmap-theme','{th}')")
                    pg = await ctx.new_page(); await pg.goto(f'http://127.0.0.1:8766/map/#{reg}'); await pg.wait_for_timeout(1300)
                    img = Image.open(io.BytesIO(await pg.screenshot())).convert('RGB')
                    items = await pg.evaluate("""(S) => { const out = []; S.forEach(s => document.querySelectorAll(s).forEach(e => { if(e.closest('[hidden]')) return; const r = e.getBoundingClientRect();
                      if(!r.width || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return; const cs = getComputedStyle(e); if(cs.visibility==='hidden' || cs.display==='none') return;
                      const fg = (s === '.field input' ? getComputedStyle(e, '::placeholder').color : cs.color);
                      out.push([s, fg, r.left, r.top, r.width, r.height, parseFloat(cs.fontSize), +cs.fontWeight]); })); return out; }""", SEL)
                    for s, fg, x, y, ww, hh, px, fw in items[:60]:
                        import re
                        m = re.findall(r'[\d.]+', fg)
                        if fg.startswith('color('): rgb = tuple(float(v)*255 for v in m[:3])
                        else: rgb = tuple(float(v) for v in m[:3])
                        box = img.crop((int(x), int(y), int(x+ww), int(y+hh)))
                        px_ = sorted((box.get_flattened_data() if hasattr(box, "get_flattened_data") else box.getdata()), key=lum)
                        if not px_: continue
                        bg = px_[int(len(px_)*.8)] if lum(rgb) < .5 else px_[int(len(px_)*.2)]
                        k = ratio(rgb, bg); need = 3 if (px >= 24 or (fw >= 700 and px >= 18.66)) else 4.5
                        key = (th, s)
                        if key not in worst or k < worst[key][0]: worst[key] = (round(k,2), need, f'{w} {reg}', tuple(map(int,rgb)), bg)
                    await ctx.close()
        await b.close()
    for (th, s), (k, need, where, fg, bg) in sorted(worst.items()):
        print(('FAIL ' if k < need else 'ok   ') + f'{th:8} {s:24} min {k} (need {need}) at {where} fg {fg} bg {bg}')
asyncio.run(main())
