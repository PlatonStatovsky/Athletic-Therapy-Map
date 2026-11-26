"""No-consent session: popup, island, typing, finish gate, finish screen without a recording section, Drive doc text."""
import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
O = os.path.join(HERE, 'norec'); os.makedirs(O, exist_ok=True)
TOAST = "$('#toastHost .toast')?.textContent || ''"
ANAM11 = "['chief_complaint','location','onset','mechanism','vas_max','vas_now','night','aggravating','neuro_symptoms','red_flags','medications']"

async def start(page, choice):
    await page.evaluate("session = null; LS.del(K.session); view = 'home'; render()"); await page.wait_for_timeout(200)
    await page.evaluate("$('#pName').value = 'ללא הקלטה'; $('#pRegion').value = 'ברך'; $('#pConsent').checked = false; window.__p = startSession(); 0")
    await page.wait_for_timeout(500)
    return await page.evaluate("[...document.querySelectorAll('dialog[open] button, .dlg button, .modal button')].map(b => b.textContent.trim())")

async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(5000)
    btns = await start(page, 'cancel')
    p('popup buttons:', btns)
    await shot(page, f'{tag}-1-popup')
    await page.get_by_role('button', name='בטל מפגש').click(); await page.wait_for_timeout(400)
    p('after בטל מפגש: session =', await page.evaluate('!!session'), '| view =', await page.evaluate('view'))
    await start(page, 'go')
    await page.get_by_role('button', name='המשך למפגש ללא הקלטה').click(); await page.wait_for_timeout(700)
    p('after המשך: view =', await page.evaluate('view'), '| consent =', await page.evaluate('session.consent'), '| consentAt =', await page.evaluate('session.consentAt'))
    p('island text:', await page.evaluate("$('#island')?.innerText.replace(/\\s+/g,' ')"), '| mic button:', await page.locator('#recBtn').count())
    await shot(page, f'{tag}-2-session')
    await page.evaluate("startRec()"); await page.wait_for_timeout(300)
    p('startRec() →', await page.evaluate('recording'), '| toast:', await page.evaluate(TOAST))
    # finish gate
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(500)
    p('finish with nothing: view =', await page.evaluate('view'), '| toast =', await page.evaluate(TOAST))
    await page.evaluate("addSegment('משהו', true)") if False else None
    await page.evaluate(f"{ANAM11}.slice(0,10).forEach(id => session.fields[id] = {{value:'x', source:'manual'}}); saveSession(true)")
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(500)
    p('finish with 10/11: view =', await page.evaluate('view'), '| toast =', await page.evaluate(TOAST))
    await page.evaluate(f"{ANAM11}.forEach(id => session.fields[id] = {{value:'x', source:'manual'}}); saveSession(true)")
    await page.locator('[data-act=finish]:visible').first.click(); await page.wait_for_timeout(900)
    p('finish with 11/11: view =', await page.evaluate('view'))
    p('finish sections:', await page.evaluate("[...document.querySelectorAll('.fin-sec h2')].map(h => h.textContent.trim())"))
    p('#fRec:', await page.locator('#fRec').count(), '| #finAudio:', await page.locator('#finAudio').count(), '| ▶:', await page.locator('[data-act=quotePlay],[data-act=segPlay]').count())
    p('consent line:', await page.evaluate("$('#fCon')?.closest('section')?.innerText.replace(/\\s+/g,' ')"))
    await shot(page, f'{tag}-3-finish')
    await shot(page, f'{tag}-3-finish-full', full=True)
    p('drive doc consent:', await page.evaluate("(sessionDocHtml(session).match(/<p[^>]*>הסכמת[^<]*<\\/p>/)||[''])[0]"))
    p('page errors:', page._errs)
    await ctx.close()

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone')
        await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
