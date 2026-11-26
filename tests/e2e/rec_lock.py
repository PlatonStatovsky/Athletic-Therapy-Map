import asyncio, json
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 1240, 860, 1)
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        await page.evaluate("view='session'; session.firstSavedAt = Date.now() - 25*3600e3; session.savedAt = session.firstSavedAt; session.folderId='f1'; render()"); await page.wait_for_timeout(500)
        r = await page.evaluate("""(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return [s, Math.round(e.getBoundingClientRect().width), c.display, c.gridTemplateColumns || '', e.className]; };
          return [document.body.className, q('.shell'), q('.main'), q('.content'), q('.rail'), [...document.querySelector('.shell').children].map(x => x.tagName + '.' + x.className + ':' + Math.round(x.getBoundingClientRect().width))]; })()""")
        for x in r: print(x)
        await b.close()
asyncio.run(main())
