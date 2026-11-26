import asyncio, json, os
exec(open('verify_finish.py').read().split('\nasync def run')[0])
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page = await mkp(b, 1240, 860, 1.5)
        await page.evaluate(SEED); await page.wait_for_timeout(400)
        await page.evaluate(EXAM); await page.wait_for_timeout(400)
        await page.evaluate("applyInsight(session, %s, ['record','body','timeline','exam','hypo'], ['complaint','details','exam'], null); saveSession(true); render()" % json.dumps({k: INSIGHT[k] for k in ['record', 'body', 'timeline', 'exam', 'hypotheses']}, ensure_ascii=False))
        await page.wait_for_timeout(400)
        await finish_from_session(page)
        await page.locator('[data-act=verifyPart]:visible').first.click(); await page.wait_for_timeout(500)
        p('card "לאמת" popover buttons:', await page.evaluate("[...document.querySelectorAll('.pop button')].map(b => (b.dataset.act||'') + ':' + b.textContent.trim()).filter(x => !x.startsWith('popClose'))"))
        await shot(page, 'tablet-7b-verify-popover')
        await page.locator('.pop [data-act=edit]').first.click(); await page.wait_for_timeout(900)
        p('after ערוך: view =', await page.evaluate('view'), '| h1 =', await page.evaluate("$('h1')?.textContent"), '| popover open =', await page.evaluate("!!$('.pop')"))
        await page.evaluate("session && (view='finish', renderFinish())"); await page.wait_for_timeout(300)
        await page.locator('[data-act=verifyPart]:visible').first.click(); await page.wait_for_timeout(500)
        u = page.locator('.pop [data-act=undo]').first
        if await u.count():
            fid = await u.get_attribute('data-fid'); await u.click(); await page.wait_for_timeout(500)
            p(f'after בטל מילוי on {fid}: value =', repr(await page.evaluate(f"session.fields['{fid}']?.value")), '| view =', await page.evaluate('view'))
        p('errors:', page._errs); await b.close()
asyncio.run(main())
