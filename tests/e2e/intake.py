"""Patient details (age, sex, address, occupation, marital) on the start screen, not in the form; dominant side and referral in the complaint.
Checks: start screen block, values in the session, form / AI fill list / "still not said" without them, record + Drive doc + AI context with them,
the popup on the patient name, prefill of a known patient, follow-up taking them from the previous session.
Run with TAG=before against an older commit on 8767 for the before screenshots (only the shots are meaningful there)."""
import asyncio, json, os
exec(open('norec.py').read().split('\nasync def run')[0])
TAG = os.environ.get('TAG', 'after'); O = os.path.join(HERE, 'intake'); os.makedirs(O, exist_ok=True)
NEW = TAG == 'after'
async def home(page):
    await page.evaluate("session = null; LS.del(K.session); view = 'home'; render()"); await page.wait_for_timeout(300)
async def run(b, w, h, tag):
    p(f'\n=========== {tag} {w}x{h} ===========')
    ctx, page = await mkp(b, w, h, 2); page.set_default_timeout(5000)
    await home(page)
    if NEW:
        p('start block closed:', await page.evaluate("!$('#pIntake').open"))
        await page.evaluate("$('#pIntake').open = true")
        await page.fill('#pName', 'דנה כהן'); await page.fill('#p_age', '34')
        await page.click('#p_sex [data-v="נקבה"]'); await page.fill('#p_occupation', 'מורה'); await page.fill('#p_marital', 'נשואה')
    else:
        await page.fill('#pName', 'דנה כהן')
    card = page.locator('section.card', has=page.locator('#newH')).first
    await card.screenshot(path=f'{O}/{TAG}-{tag}-start.png')
    await page.evaluate("$('#pConsent').checked = true; window.__p = startSession(); 0"); await page.wait_for_timeout(800)
    if NEW:
        p('session fields:', await page.evaluate("JSON.stringify(Object.fromEntries(INTAKE.map(id => [id, session.fields[id]?.value || ''])))"))
        p('patient intake stored:', await page.evaluate("JSON.stringify(patients.find(x => x.name === 'דנה כהן')?.intake)"))
        p('form personal section:', await page.evaluate("sectionsFor(session).find(x => x.id === 'details').fields.map(f => f.label)"))
        p('complaint ends with:', await page.evaluate("sectionsFor(session).find(x => x.id === 'complaint').fields.slice(-2).map(f => f.label)"))
        p('fill list has age:', await page.evaluate("extractSystem(session).includes('- age —')"), '| fill enum has age:', await page.evaluate("fillSchema(session).properties.updates.items.properties.id.enum.includes('age')"))
        p('still-not-said has age/occupation:', await page.evaluate("missingFields(session).some(x => ['age','occupation'].includes(x.f.id))"))
        p('fill context has age:', await page.evaluate("JSON.stringify(currentValues(session))"))
        p('Drive doc: ', await page.evaluate("(sessionDocHtml(session).match(/פרטים אישיים<\\/h2>[\\s\\S]*?<h2/)||[''])[0].replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ')"))
    await page.evaluate("tab='form'; renderTab()"); await page.wait_for_timeout(400)
    stg = page.locator('#stg-anamnesis'); await stg.scroll_into_view_if_needed()
    await page.evaluate("$('#stg-anamnesis').open = true"); await page.wait_for_timeout(200)
    await page.locator('#stg-anamnesis').screenshot(path=f'{O}/{TAG}-{tag}-form.png', timeout=8000) if h > 0 else None
    if NEW:
        await page.evaluate("tab='live'; renderTab(); window.scrollTo(0,0)"); await page.wait_for_timeout(300)
        await page.click('.ptname'); await page.wait_for_timeout(400)
        p('popup values:', await page.evaluate("JSON.stringify(readIntake('i'))"))
        await page.screenshot(path=f'{O}/{TAG}-{tag}-popup.png')
        c0 = len(CALLS); await page.fill('#i_age', '35'); await page.fill('#i_address', 'רעננה'); await page.click('[data-act=intakeSave]'); await page.wait_for_timeout(900)
        p('after popup save:', await page.evaluate("session.fields.age.value + ' | ' + session.fields.address.value"), '| update sent to Claude:', len(CALLS) > c0, '| patient:', await page.evaluate("patients.find(x => x.name === 'דנה כהן').intake.age"))
        # prefill on a known name
        await page.evaluate("session.savedAt = new Date().toISOString(); session.changedAt = 0; saveSession(true)")
        await home(page)
        await page.fill('#pName', 'דנה כהן'); await page.wait_for_timeout(200)
        p('prefill on known name:', await page.evaluate("JSON.stringify(readIntake('p'))"), '| block open:', await page.evaluate("$('#pIntake').open"))
        await page.fill('#pName', 'מישהו חדש'); await page.wait_for_timeout(200)
        # follow-up: empty details taken from the previous session (attachPrev, Drive faked here)
        await page.evaluate("""(() => { const s = { id: 'x', fields: {}, patientName: 'דנה כהן' };
          const ps = { fields: { age: { value: '36' }, sex: { value: 'נקבה' } } };
          const fromPrev = INTAKE.filter(id => !s.fields[id]?.value && ps.fields[id]?.value);
          for (const id of fromPrev) s.fields[id] = { value: String(ps.fields[id].value), source: 'manual' };
          window.__fu = Object.keys(s.fields); })()""")
        p('follow-up logic copies:', await page.evaluate("window.__fu"))
        p('locked popup read-only:', await page.evaluate("(() => { const s0 = session; session = { ...s0, firstSavedAt: Date.now() - 3*86400e3 }; const h = intakePopHtml(); session = s0; return h.includes('inert') && !h.includes('intakeSave'); })()"))
    p('page errors:', page._errs)
    await ctx.close()
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        await run(b, 390, 844, 'phone'); await run(b, 1240, 860, 'tablet')
        await b.close()
asyncio.run(main())
