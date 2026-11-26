import asyncio, json, os
exec(open('ba2_shots.py').read().split('\nasync def run')[0])
async def run(b, ver, url):
    global APP
    APP = url
    ctx, page = await mkp(b, 390, 844, 2)
    await demo(page)
    await page.evaluate("session.notes=[{id:'n1',text:'לבדוק Neer בסוף',at:Date.now(),status:'filed',task:'לבדוק Neer בסוף הבדיקה'},{id:'n2',text:'כתף ימין מורמת במנוחה',at:Date.now(),status:'filed',field:'observation'}]; session.fields.observation={value:(ver==='before'?'פתק: ':'טקסט חופשי: ')+'כתף ימין מורמת במנוחה',source:'note'}; saveSession(true); tab='live'; render()".replace('ver', repr(ver)))
    await page.wait_for_timeout(400)
    ob = page.locator('[data-act=noteOpen]').first
    if await ob.count(): await ob.click(); await page.wait_for_timeout(400)
    await page.screenshot(path=f'{D}/{ver}-notebar.png', clip={'x': 0, 'y': 844 - 260, 'width': 390, 'height': 260})
    nl = page.locator('section.card', has=page.locator('#noteH')).first
    if await nl.count():
        await nl.scroll_into_view_if_needed(); await page.wait_for_timeout(300); await nl.screenshot(path=f'{D}/{ver}-notelist.png')
    print(ver, 'notes card:', await nl.count(), '| placeholder:', await page.evaluate("$('#noteIn')?.placeholder"), '| errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 'before', 'http://127.0.0.1:8767/app/index.html')
        await run(b, 'after', 'http://127.0.0.1:8766/app/index.html')
        await b.close()
asyncio.run(main())
