"""Visual check: phone / tablet portrait / tablet landscape, three themes, coloured analysis."""
import asyncio, json, os
from playwright.async_api import async_playwright

APP = 'http://127.0.0.1:8765/index.html'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'v')
os.makedirs(OUT, exist_ok=True)

ANALYSIS = """**אין דגל אדום שמחייב הפנייה כרגע — אבל כאב הלילה עוד לא סווג.**
## סיכום קליני
כאב כתף ימין הדרגתי 6 שבועות, מורה לחנ"ג וטניסאי, VAS 7 בהגשה. תמונה מתאימה ל-SAPS (מפת דרך — כתף).
## דגלים
- [[done: ירידה במשקל — שלילי]]
- [[must: לשלול כאב לילה לא מכני / כאב במנוחה]]
- [[must: סינון צווארי — Spurling ו-ULNT לפני העמסה]]
- דגלים צהובים: חשש לפספס עונה.
## השערות עבודה
1. **SAPS** — בעד: Painful arc, כאב בהרמה מעל הראש. נגד: אין. מה יכריע: הקלאסטר.
2. Rotator cuff tear חלקי — מה יכריע: [[rec: Drop arm]], [[rec: ER lag sign]].
## מבדקים
- [[done: Hawkins-Kennedy ימין — חיובי]]
- [[done: Painful arc — חיובי 70°–120°]]
- [[rec: Infraspinatus test]] — משלים את הקלאסטר (LR+ 10.6 כששלושתם חיוביים).
- [[must: AROM צוואר ו-Spurling]] לפני כל מבדק פרובוקטיבי נוסף.
## מידע חסר
- [[rec: שאלון QuickDASH]] כקו בסיס.
"""

async def shot(b, name, w, h, theme, tab='form', setup=None):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1.5, locale='he-IL')
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'text/css'}, body=''))
    await page.route('https://accounts.google.com/**', lambda r: r.fulfill(status=200, headers={'content-type': 'application/javascript'}, body=''))
    await page.add_init_script(f"""
      localStorage.setItem('ca.settings', JSON.stringify({{apiKey:'sk', clientId:'cid', theme:'{theme}', autoFill:false, kbVer:2}}));
      localStorage.setItem('ca.patients', JSON.stringify([{{name:'דני כהן',region:'כתף',last:'2026-10-20T10:00:00Z'}},{{name:'מיכל לוי',region:'ברך',last:'2026-10-25T10:00:00Z'}}]));
      window.webkitSpeechRecognition = window.SpeechRecognition = function(){{ this.start=function(){{}}; this.stop=function(){{}}; }};
    """)
    await page.goto(APP)
    await page.wait_for_timeout(250)
    if setup == 'home':
        pass
    elif setup == 'settings':
        await page.click('[data-act="settings"]'); await page.wait_for_timeout(200)
    else:
        await page.fill('#pName', 'דני כהן'); await page.select_option('#pRegion', 'כתף'); await page.check('#pConsent')
        await page.click('[data-act="start"]'); await page.wait_for_timeout(200)
        await page.evaluate("""(an) => {
          const set = (id, v, extra={}) => session.fields[id] = {value: v, source: 'ai', quote: v, at: Date.now(), ...extra};
          set('age', '34'); set('occupation', 'מורה לחינוך גופני, משחק טניס'); set('chief_complaint', 'כאב בכתף ימין בהרמת היד מעל הראש, בעיקר בהגשה');
          set('location', 'קדמי-לטרלי, כתף ימין'); set('onset', 'הדרגתי, לפני כ-6 שבועות, בלי חבלה'); set('vas_max', '7', {needsCheck: true}); set('vas_now', '2');
          set('aggravating', 'הגשה בטניס, הרמת תיקים לארון'); set('night', 'מתעורר כשהוא שוכב על הצד', {needsCheck: true});
          ['שלום, אני בן שלושים וארבע', 'אני מורה לספורט ומשחק טניס פעמיים בשבוע', 'כואב לי בכתף ימין כשאני מרים את היד', 'בערך שבע בהגשה', 'התחיל לאט לפני חודש וחצי', 'בלילה אני מתעורר כשאני שוכב על הצד הזה'].forEach(t => addSegment(t));
          session.analysis = an; session.analysisAt = Date.now(); saveSession(true); renderSession();
        }""", ANALYSIS)
        if tab != 'form':
            await page.click(f'#tabs [data-tab="{tab}"]'); await page.wait_for_timeout(150)
    await page.wait_for_timeout(150)
    sw = await page.evaluate('document.documentElement.scrollWidth')
    await page.screenshot(path=f'{OUT}/{name}.png', full_page=False)
    print(f'{name}: scrollWidth={sw} (viewport {w}) errors={errs}')
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await shot(b, 'a-tab-land-form-light', 1280, 800, 'light')
        await shot(b, 'b-tab-land-analysis-comfort', 1280, 800, 'comfort', tab='analysis')
        await shot(b, 'c-tab-land-analysis-dark', 1280, 800, 'dark', tab='analysis')
        await shot(b, 'd-tab-port-form-comfort', 800, 1280, 'comfort')
        await shot(b, 'e-tab-port-home-light', 800, 1280, 'light', setup='home')
        await shot(b, 'f-tab-land-settings-comfort', 1280, 800, 'comfort', setup='settings')
        await shot(b, 'g-phone-analysis-light', 390, 844, 'light', tab='analysis')
        await shot(b, 'h-phone-form-comfort', 390, 844, 'comfort')
        await b.close()
asyncio.run(main())
