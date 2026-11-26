import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for port, name in [(8767,'before (app)'),(8766,'merged')]:
            for w in (1240, 390):
                pg = await b.new_page(viewport={'width':w,'height':860})
                await pg.goto(f'http://127.0.0.1:{port}/index.html#shoulder&t=neer'); await pg.wait_for_timeout(1200)
                print(name, w, '| ptest =', await pg.evaluate("typeof ptest !== 'undefined' ? ptest : 'n/a'"), '| panel:', (await pg.evaluate("document.querySelector('#panel')?.innerText.slice(0,80).replace(/\\s+/g,' ')")))
                await pg.close()
        await b.close()
asyncio.run(main())
