import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); pg = await b.new_page(viewport={'width':1240,'height':860})
        await pg.goto('http://127.0.0.1:8766/index.html'); await pg.wait_for_timeout(800)
        ids = await pg.evaluate("Object.keys(T).filter(k => /hawk|neer|lachman/i.test(k))")
        print('ids:', ids)
        for tid, tab in [(ids[0], 'shoulder'), ([i for i in ids if 'lach' in i.lower()] or [ids[-1]])[0], ][:1] if False else [(ids[0],'shoulder')]:
            await pg.goto(f'http://127.0.0.1:8766/index.html#{tab}&t={tid}'); await pg.reload(); await pg.wait_for_timeout(1000)
            print(tid, '→', await pg.evaluate("document.querySelector('#panel h2, #panel h3')?.textContent"))
        lach = [i for i in ids if 'lach' in i.lower()]
        if lach:
            await pg.goto(f'http://127.0.0.1:8766/index.html#knee&t={lach[0]}'); await pg.reload(); await pg.wait_for_timeout(1000)
            print(lach[0], '→', await pg.evaluate("document.querySelector('#panel h2, #panel h3')?.textContent"))
        await pg.screenshot(path='merge/tablet-deeplink.png'); await b.close()
asyncio.run(main())
