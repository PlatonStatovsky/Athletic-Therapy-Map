import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); page = await b.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
        await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
        await page.route('https://raw.githubusercontent.com/**', lambda r: r.fulfill(status=200, headers={'content-type':'text/plain','access-control-allow-origin':'*'}, body=open('/home/claude/athletic-therapy-map/index.html',encoding='utf-8').read()))
        await page.goto('http://127.0.0.1:8767/'); await page.wait_for_timeout(400)
        print('HAS_MAP:', await page.evaluate('HAS_MAP'), '| SITE_SRC:', await page.evaluate('SITE_SRC')[:60] if False else await page.evaluate('SITE_SRC'), '| map buttons:', await page.evaluate("$$('.top a.icon-btn').length"))
        kb = await page.evaluate("loadKB('כתף', true).then(k => [k.docs.length, k.chars, k.problems.slice(0,1)])")
        print('KB at root (GitHub fallback):', kb, '| errors:', errs)
        await b.close()
asyncio.run(main())
