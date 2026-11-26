"""Contrast of the new assistant elements in each theme (WCAG ratio of text vs its effective background)."""
import asyncio, json
from playwright.async_api import async_playwright
exec(open('run10.py').read().split('async def main')[0])
JS = """() => {
  const lum = c => { const m = c.match(/[\\d.]+/g).map(Number); const [r,g,b] = (c.startsWith('color(') ? m.slice(0,3).map(x=>x*255) : m.slice(0,3)).map(v => { v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*r+0.7152*g+0.0722*b; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(b)) return b; } return getComputedStyle(document.body).backgroundColor; };
  const ratio = el => { const a = lum(getComputedStyle(el).color), b = lum(bgOf(el)); return +((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2); };
  const pick = (sel) => { const e = document.querySelector(sel); return e ? ratio(e) : null; };
  return { chipI1: pick('.chip.miss.i1'), chipI2: pick('.chip.miss.i2'), chipI3: pick('.chip.miss.i3'), badgeBad: pick('.badge.bad'), badgeChk: pick('.badge.chk'),
    spk2: pick('.spk.s2'), saveState: pick('#saveState'), frTime: pick('.fr-l span'), capK: pick('.cap-row .k'), empty: pick('.empty-note'), tabOff: pick('#tabs [aria-selected=false]'), legend: pick('.miss-key span') };
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for theme in ['light', 'comfort', 'dark']:
            ctx = await b.new_context(viewport={'width': 1000, 'height': 625}, locale='he-IL')
            page = await ctx.new_page()
            for pat in ['https://fonts.googleapis.com/**', 'https://accounts.google.com/**']:
                await page.route(pat, lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
            await page.add_init_script("localStorage.setItem('ca.settings', JSON.stringify({apiKey:'', clientId:'cid', autoFill:false, kbVer:2, siteKB:false, engine:'soniox', accessCode:'x'}));" + f"localStorage.setItem('uqmap-theme','{theme}');")
            await page.goto(APP); await page.wait_for_timeout(300); await page.evaluate(SEED); await page.wait_for_timeout(300)
            print(theme, json.dumps(await page.evaluate(JS)))
            await ctx.close()
        await b.close()
asyncio.run(main())
