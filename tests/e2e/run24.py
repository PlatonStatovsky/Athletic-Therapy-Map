"""Priority 3: dark panel, map link, note bar room, phone layout, mic at rest, Summary tab."""
import asyncio, os
exec(open('run23.py').read().split('async def main')[0])
O = os.path.join(HERE, 'p3'); os.makedirs(O, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        ctx, page = await ctx_page(b, 1280, 800, theme='light')
        await page.evaluate(SEED); await page.evaluate(EXAM); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500); await page.evaluate("render()"); await page.wait_for_timeout(300)
        print('mic idle bg:', await page.evaluate("getComputedStyle($('#recBtn')).backgroundColor"), '| timer color:', await page.evaluate("getComputedStyle($('#timer')).color"), '| ticker:', await page.evaluate("recTicker"))
        await page.screenshot(path=f'{O}/1-desktop.png')
        # map link: named tab, ↗, menu closes
        await page.click('[data-act=more]'); await page.wait_for_timeout(300)
        print('map link:', await page.evaluate("[$('.mapgo').target, $('.mapgo').rel, !!$('.mapgo .ext svg'), $('.mapgo').getAttribute('href')]"))
        await page.screenshot(path=f'{O}/2-more.png')
        async with ctx.expect_page() as np:
            await page.click('.mapgo')
        newp = await np.value; await page.wait_for_timeout(400)
        print('menu closed:', await page.evaluate("!$('.pop')"), '| new tab name:', await newp.evaluate("window.name"))
        await newp.close()
        # theme switch rebuilds the transcript panel
        n0 = await page.evaluate("$('#inspIn') && ($('#inspIn').dataset.k = 'old')")
        await page.evaluate("setTheme('dark')"); await page.wait_for_timeout(300)
        print('panel rebuilt after theme:', await page.evaluate("$('#inspIn')?.dataset.k !== 'old'"), await page.evaluate("getComputedStyle($('#inspIn')).backgroundColor"))
        await page.evaluate("setTheme('light')"); await page.wait_for_timeout(200)
        # summary tab
        await page.click('.rail [data-tab=summary]'); await page.wait_for_timeout(500)
        print('summary order:', await page.evaluate("[...$('#tabBody').children].map(c => (c.querySelector('h2')?.textContent || c.className).trim())"), '| fold open:', await page.evaluate("$('.vizfold')?.open"))
        await page.screenshot(path=f'{O}/3-summary.png')
        await page.fill('#t-plan_next', 'מפגש מעקב בעוד שבוע'); await page.evaluate("document.activeElement.blur()"); await page.wait_for_timeout(400)
        print('doc shows plan:', await page.evaluate("$('#docPrev').textContent.includes('מפגש מעקב בעוד שבוע')"))
        await page.click('.vizfold > summary'); await page.wait_for_timeout(500)
        print('fold opened, chart drawn:', await page.evaluate("!!$('.vizfold .tl svg')"))
        await page.screenshot(path=f'{O}/4-summary-open.png', full_page=True)
        errs += page._errs; await ctx.close()
        for th in ['comfort', 'dark']:
            ctx, page = await ctx_page(b, 390, 844, theme=th)
            await page.evaluate(SEED); await page.evaluate(EXAM); await page.evaluate("runInsight(true)"); await page.wait_for_timeout(1500); await page.evaluate("render()"); await page.wait_for_timeout(300)
            await page.evaluate("window.scrollTo(0, 300)"); await page.wait_for_timeout(200)
            r = await page.evaluate("""() => ({ trtab: !!$('.trtab') && getComputedStyle($('.trtab')).display, phtr: getComputedStyle($('.ph-tr')).display, toolbarBg: getComputedStyle($('.toolbar')).backgroundColor,
              folded: $('.notebar')?.classList.contains('folded'), nbW: Math.round($('.notebar').getBoundingClientRect().width), chrome: Math.round($('.toolbar').getBoundingClientRect().height + (innerHeight - $('.notebar').getBoundingClientRect().top)) })""")
            print(390, th, r)
            await page.screenshot(path=f'{O}/5-phone-{th}.png')
            await page.click('.notebar .gl'); await page.wait_for_timeout(300)
            print('  note opened:', await page.evaluate("[!$('.notebar').classList.contains('folded'), document.activeElement.id]"))
            await page.fill('#noteIn', 'לבדוק Neer'); await page.keyboard.press('Enter'); await page.wait_for_timeout(1500)
            print('  note added:', await page.evaluate("session.notes.length"), 'folded after blur:', await page.evaluate("document.activeElement.blur(), 0"))
            await page.wait_for_timeout(300); print('  folded:', await page.evaluate("$('.notebar').classList.contains('folded')"))
            await page.click('.ph-tr'); await page.wait_for_timeout(500)
            print('  transcript overlay:', await page.evaluate("!!$('.insp.overlay')"))
            await page.screenshot(path=f'{O}/6-phone-tr-{th}.png')
            errs += page._errs; await ctx.close()
        print('errors:', errs); await b.close()
asyncio.run(main())
