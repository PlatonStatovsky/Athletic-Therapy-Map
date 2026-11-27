"""Ligamentum map: WCAG AA contrast of every visible text run (own text nodes), in light / comfort / dark, desktop #general #knee and a test card,
phone #knee. Background = composite of ancestor backgrounds (alpha blended down to the page --bg). Prints failures grouped by selector.
Text under backdrop-filter glass is measured against the glass tint over --bg (the pale atmosphere is ignored), so treat those as approximate."""
import asyncio, os, json
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://127.0.0.1:8766')
JS = r"""(() => {
  const parse = c => { const s = c.match(/color\(srgb ([^)]+)\)/); if(s){ const p = s[1].split(/[ \/]+/).filter(Boolean).map(Number); return [p[0]*255, p[1]*255, p[2]*255, p.length > 3 ? p[3] : 1]; } const m = c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const over = (top, bot) => { const a = top[3]; return [top[0]*a + bot[0]*(1-a), top[1]*a + bot[1]*(1-a), top[2]*a + bot[2]*(1-a), 1]; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }; return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2]); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const pageBg = parse(getComputedStyle(document.body).backgroundColor) || [255,255,255,1];
  const bgOf = el => { const stack = []; for(let e = el; e && e.nodeType === 1; e = e.parentElement){ const c = parse(getComputedStyle(e).backgroundColor); if(c && c[3] > 0) stack.push(c); if(c && c[3] >= 1) break; }
    let col = pageBg; for(let i = stack.length - 1; i >= 0; i--) col = over(stack[i], col); return col; };
  const out = []; const seen = new Set();
  const W = innerWidth, H = innerHeight;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while(tw.nextNode()){
    const n = tw.currentNode; if(!n.textContent.trim()) continue; const el = n.parentElement; if(!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el); if(cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if(!r.width || !r.height || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
    if(el.closest('[hidden], .sr, .tip')) continue;
    let fg = parse(cs.color); if(!fg) continue; const bg = bgOf(el); if(fg[3] < 1) fg = over(fg, bg);
    let op = 1; for(let e = el; e; e = e.parentElement){ op *= +getComputedStyle(e).opacity; } if(op < 1) fg = over([fg[0],fg[1],fg[2],op], bg);
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700; const large = px >= 24 || (bold && px >= 18.66);
    const k = ratio(fg, bg), need = large ? 3 : 4.5;
    if(k < need){ const cls = (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')) + ' < ' + (el.parentElement ? (el.parentElement.tagName.toLowerCase() + (typeof el.parentElement.className === 'string' && el.parentElement.className ? '.' + el.parentElement.className.trim().split(/\s+/)[0] : '')) : '');
      out.push({ sel: cls, ratio: +k.toFixed(2), need, text: n.textContent.trim().slice(0, 30), fg: fg.slice(0,3).map(Math.round).join(','), bg: bg.slice(0,3).map(Math.round).join(',') }); }
  }
  // placeholder of the search field
  const q = document.querySelector('#q'); if(q){ const pc = parse(getComputedStyle(q, '::placeholder').color); const bg = bgOf(q.closest('.field') || q); if(pc){ const f = pc[3] < 1 ? over(pc, bg) : pc; const k = ratio(f, bg); if(k < 4.5) out.push({ sel: 'input#q::placeholder', ratio: +k.toFixed(2), need: 4.5, text: 'placeholder', fg: f.slice(0,3).map(Math.round).join(','), bg: bg.slice(0,3).map(Math.round).join(',') }); } }
  return out;
})()"""
async def run(b, theme, w, h, path, mobile=False, scrolls=(0, 900, 1800)):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile)
    await ctx.add_init_script(f"localStorage.setItem('uqmap-theme','{theme}')")
    pg = await ctx.new_page(); await pg.goto(BASE + path); await pg.wait_for_timeout(1200)
    allf = []
    for s in scrolls:
        await pg.evaluate(f"window.scrollTo(0,{s})"); await pg.wait_for_timeout(250)
        await pg.evaluate("document.querySelectorAll('section:not([hidden]) details.chk').forEach(d => d.open = true)")
        allf += await pg.evaluate(JS)
    await ctx.close(); return allf
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); report = {}
        for th in ('light', 'comfort', 'dark'):
            f = []
            for path in ('/map/#general', '/map/#knee', '/map/#knee&t=lachman', '/map/#shoulder&t=neer'):
                f += await run(b, th, 1440, 900, path)
            f += await run(b, th, 390, 844, '/map/#knee', True)
            g = {}
            for x in f:
                k = x['sel']; g.setdefault(k, []).append(x)
            report[th] = {k: {'n': len(v), 'min': min(i['ratio'] for i in v), 'need': v[0]['need'], 'ex': v[0]['text'], 'fg': v[0]['fg'], 'bg': v[0]['bg']} for k, v in g.items()}
        await b.close()
    for th, g in report.items():
        print(f'== {th}: {len(g)} selectors below AA')
        for k, v in sorted(g.items(), key=lambda kv: kv[1]['min']): print(f"  {v['min']:>5} /{v['need']}  x{v['n']:<3} {k[:70]}  «{v['ex']}»  fg {v['fg']} bg {v['bg']}")
asyncio.run(main())
