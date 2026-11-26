import asyncio
exec(open('verify_finish3.py').read().split('\nasync def run')[0])
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx, page = await mkp(b, 390, 844, 1)
        await page.evaluate(EMPTY.replace("startSession();", "setPType('מפגש מעקב'); startSession();")); await page.wait_for_timeout(400)
        p(await page.evaluate("fieldsFor(session).map(f => f.id).join(',')"))
        p(await page.evaluate("fieldsFor(session).filter(f=>/red|flag/.test(f.id)).map(f => f.id + ':' + f.label).join(' | ')"))
        p(await page.evaluate("JSON.stringify(Object.fromEntries(Object.entries(session.fields).map(([k,v])=>[k,v.value])))"))
        await page.evaluate(SEED); await page.wait_for_timeout(300)
        p('SEED red_flags:', await page.evaluate("session.fields.red_flags?.value"), '| type', await page.evaluate('session.type'))
        await b.close()
asyncio.run(main())
