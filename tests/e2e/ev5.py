"""Hypotheses board: 0–5 supporting and 0–5 contradicting facts per hypothesis (SRS), empty column labelled.
Run with BASE=http://127.0.0.1:8767 against an older commit for the "before" screenshots."""
import asyncio, json, os
exec(open('hypo.py').read().split('\nasync def run')[0])
TAG = os.environ.get('TAG', 'after'); O = os.path.join(HERE, 'ev5'); os.makedirs(O, exist_ok=True)
EIGHT = ['Painful Arc חיובי', 'Hawkins חיובי', 'Neer חיובי', 'כאב מעל הראש', 'מנגנון עומס חוזר', 'כאב בלילה על הצד', 'Empty Can כואב', 'גיל 45']
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(6000)
    await page.evaluate(EMPTY); await page.wait_for_timeout(300)
    await page.evaluate("['chief_complaint','location','onset','mechanism'].forEach(id => session.fields[id] = {value:'x', source:'manual'}); saveSession(true); tab='live'; render()")
    await page.wait_for_timeout(300)
    await apply(page, [H(SAPS, 'supported', EIGHT, []), H(TEAR, 'weakened', ['כאב בהתנגדות'], ['Drop Arm שלילי', 'כוח 5/5'])])
    p('stored counts [support, against]:', await page.evaluate("insState().hypo.map(h => [h.support.length, h.against.length])"))
    p('shown li per hypothesis:', await page.evaluate("[...document.querySelectorAll('.hyp')].map(e => [...e.querySelectorAll('.ev > div')].map(d => d.querySelectorAll('li').length))"))
    p('empty column text:', await page.evaluate("[...document.querySelectorAll('.hyp .ev .muted')].map(e => e.textContent)"))
    await card(page, f'{TAG}-{tag}')
    c0 = len(CALLS); await page.evaluate("runInsight(false, ['hypo'])"); await page.wait_for_timeout(1200)
    sysp = json.dumps(CALLS[-1].get('system', ''), ensure_ascii=False) if len(CALLS) > c0 else ''
    p('prompt says at most 5:', 'at most 5 each' in sysp)
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
