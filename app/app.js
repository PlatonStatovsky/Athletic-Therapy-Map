/* Thalamus, the clinic assistant. Loaded by app/index.html; kept out of the page so the
   Content-Security-Policy can forbid inline scripts. */
'use strict';
/* ============================================================
   עוזר קליני — Clinic Assistant
   Recording → Hebrew speech recognition → form auto-fill (Claude API)
   → clinical analysis grounded in the therapist's Drive knowledge base
   → per-patient folders in Google Drive.
   Everything runs on the phone; keys stay in this browser's storage.
   ============================================================ */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// numbers keep their own direction inside Hebrew text, so "150°", "4+", "1/9", "17:30" never flip
const NUM_RE = /(&[#a-z0-9]+;)|(\d+(?:[.,:]\d+)*(?:[+-](?!\s?\d))?(?:\s?(?:°|%))?(?:\s?[\/–-]\s?\d+(?:[.,:]\d+)*(?:[+-](?!\s?\d))?(?:\s?(?:°|%))?)?)/gi;
const escN = t => esc(t).replace(NUM_RE, (m, ent, num) => ent || `<bdi dir="ltr">${num}</bdi>`);
const pad = n => String(n).padStart(2, '0');

/* ---------------- storage ---------------- */
const K = { settings: 'ca.settings', patients: 'ca.patients', session: 'ca.session', kb: 'ca.kbcache', usage: 'ca.usage' };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('שמירה מקומית נכשלה: ' + e.message, true); return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { } }
};

// Lesson summaries in the therapist's Drive: "link | regions | parts". No regions = every analysis.
// The upper-quadrant decision map comes from the athletic-therapy-map site (settings.siteKB), not from this list.
const KB_DEFAULT = `# רביע עליון — סיכומי הקורס
https://docs.google.com/document/d/1y-rbmEH-RaofY5U_KjCob3AphPuvQDhNE6__4wUn0H4/edit | צוואר וראש, כתף
https://docs.google.com/document/d/1w4WaEasDHYIM2dgv5NZfQLvgeyCBrlUV3xN1T0IcuH0/edit | צוואר וראש, כתף, מרפק, שורש כף יד וכף יד
https://docs.google.com/document/d/1tFbneN26GslZvhsnilawMrSOmhXCLYj-PnKmsLA2V74/edit | מרפק, שורש כף יד וכף יד
https://docs.google.com/document/d/1kNxMopGomXkwtlg90lpF09tVIiEvaqpTIT4u0BWxiwo/edit | צוואר וראש, כתף, מרפק, שורש כף יד וכף יד
# גב, אגן וגפה תחתונה — קורס הקיץ
https://docs.google.com/document/d/1cHNuHIddG73-fnsHg-wrYPMjRr78MfnbUyMVrsJcH-Y/edit | גב תחתון, ירך ואגן
https://drive.google.com/file/d/1Qnq6m5gDKvckqx76C1QwntHN6x49Y496/view | גב תחתון, ירך ואגן
https://drive.google.com/file/d/1daHzXbqlaiBStT5CLSIwlY5nAjaojk0v/view | ירך ואגן
https://drive.google.com/file/d/1b_fyv28PrL5X-IhDH14XkiJo7i9dsU5y/view | ירך ואגן
https://docs.google.com/document/d/1Wpnv9mjXH4rwsvOhqNcqrXiG5OmiX3zOH7S-Ko0-h9M/edit | ברך
https://docs.google.com/document/d/1Tk-9SRI2QJpll-XmWNoviEWIIEhONBtETIQwK49mm3g/edit | ברך
https://docs.google.com/document/d/16ZhbOBQzKvjcRrqB9GmVf5mVWANtNsCAQo-xUwLjMOk/edit | קרסול וכף רגל, ברך
https://docs.google.com/document/d/1h1fhVIq_TlFwe4x_IcWYUectECUTekzhvOUbGb4Q5Ic/edit | קרסול וכף רגל
# מאגר המבדקים — כל אזור מקבל רק את החלקים שלו
https://drive.google.com/file/d/17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX/view | גב תחתון, ירך ואגן, ברך, קרסול וכף רגל, אחר | חלק א, חלק ב
https://drive.google.com/file/d/17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX/view | גב תחתון, ירך ואגן | חלק ג
https://drive.google.com/file/d/17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX/view | ירך ואגן | חלק ד
https://drive.google.com/file/d/17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX/view | ברך | חלק ה
https://drive.google.com/file/d/17KujdVmoq22YEX7vTiF1nWE6RvNuFnhX/view | קרסול וכף רגל | חלק ו
# כללי — לכל ניתוח: חשיבה קלינית, עצמות ושברים, שרירים
https://drive.google.com/file/d/1zUknvWbO_UMJhgj0ZYFrefFlM8oy945P/view
https://drive.google.com/file/d/1FF0nX8mUgek0E7EspDHfmqcWOE9tbM8Q/view
https://drive.google.com/file/d/1eZYbwtAfj7o2ZMRjeb6fJQ5doWqe3oZH/view`;
const KB_OLD_DEFAULT = 'https://docs.google.com/document/d/1w69Gy6xERTPrLEa3kJpLsPf4nL0DCDsy_zpxN8VGBvE/edit\nhttps://docs.google.com/document/d/1Tk-9SRI2QJpll-XmWNoviEWIIEhONBtETIQwK49mm3g/edit | ברך';

const DEFAULT_SETTINGS = {
  extractModel: 'claude-sonnet-5-5', analysisModel: 'claude-opus-5-5',
  clientId: '', rootFolderName: 'מטופלים', rootFolderId: '',
  kbDocs: KB_DEFAULT, extraKB: '', siteKB: true, kbBudget: 350, kbVer: 2, engine: 'browser', accessCode: '', saveAudio: true,
  autoFill: true, fillChars: 600, continuous: true, lang: 'he-IL'
};
const storedSettings = LS.get(K.settings, null);
let settings = { ...DEFAULT_SETTINGS, ...(storedSettings || {}) };
if (storedSettings && (storedSettings.kbVer || 1) < 2) { // version 1 kept the knowledge base as two Google Docs; the site now covers the decision map
  if (String(settings.kbDocs || '').trim() === KB_OLD_DEFAULT || !String(settings.kbDocs || '').trim()) settings.kbDocs = KB_DEFAULT;
  settings.kbVer = 2; LS.set(K.settings, settings);
}
if ('apiKey' in settings) { delete settings.apiKey; LS.set(K.settings, settings); }
let patients = LS.get(K.patients, []);
let session = LS.get(K.session, null);
// with encryption on, these two hold {enc:1, iv, ct} until the vault is unlocked with Google
const LOCKED = { session: session?.enc ? session : null, patients: patients?.enc ? patients : null };
if (LOCKED.session) session = null;
if (LOCKED.patients) patients = [];
let usage = LS.get(K.usage, { total: 0 });
const saveSettings = () => LS.set(K.settings, settings);
const savePatients = () => persist(K.patients, patients);
let saveTimer = null;
function saveSession(now = false) {
  clearTimeout(saveTimer);
  const go = () => { if (session) persist(K.session, session); else LS.del(K.session); };
  if (now) go(); else saveTimer = setTimeout(go, 400);
}
// plain JSON, or sealed with the vault key when encryption is on; never plaintext while it is on and locked
const persistSeq = {}; // per key: only the newest sealed copy is written
function persist(k, v) {
  if (!settings.encrypt) return LS.set(k, v);
  if (!VAULT.key) return false;
  const seq = persistSeq[k] = (persistSeq[k] || 0) + 1;
  seal(v).then(sealed => { if (seq === persistSeq[k]) LS.set(k, sealed); }).catch(e => toast('שמירה מוצפנת נכשלה: ' + e.message, true));
  return true;
}

/* ---------------- domain: regions & form ---------------- */
const REGIONS = ['צוואר וראש', 'כתף', 'מרפק', 'שורש כף יד וכף יד', 'גב תחתון', 'ירך ואגן', 'ברך', 'קרסול וכף רגל', 'אחר'];
const TYPES = ['הערכה ראשונית', 'מפגש מעקב'];
const STAGES = [
  { id: 'anamnesis', label: 'אנמנזה', sections: ['followup', 'details', 'complaint', 'associated', 'function', 'history', 'flags'] },
  { id: 'exam', label: 'בדיקה', sections: ['exam'] },
  { id: 'summary', label: 'סיכום', sections: ['summary'] }
];

// key = shows in the "missing" checklist; critical = AI-filled value is flagged for the therapist to confirm
const FORM = [
  { id: 'followup', title: 'מעקב', only: 'מפגש מעקב', fields: [
    { id: 'changes', label: 'מה השתנה מאז המפגש הקודם', key: 1 },
    { id: 'lead_sign', label: 'שינוי בסימן הסובייקטיבי המוביל', key: 1 },
    { id: 'adherence', label: 'תרגול ביתי — היענות', key: 1 },
    { id: 'response', label: 'תגובה לטיפול הקודם' }
  ]},
  { id: 'details', title: 'פרטים אישיים', fields: [
    { id: 'name', label: 'שם פרטי ומשפחה' },
    { id: 'age', label: 'גיל', key: 1 },
    { id: 'sex', label: 'מין' },
    { id: 'address', label: 'כתובת' },
    { id: 'occupation', label: 'מקצוע', key: 1 },
    { id: 'marital', label: 'מצב משפחתי' },
    { id: 'dominant_hand', label: 'יד / רגל דומיננטית' },
    { id: 'referral', label: 'גורם מפנה ואבחנה מפנה' }
  ]},
  { id: 'complaint', title: 'תלונה עיקרית', fields: [
    { id: 'chief_complaint', label: 'תלונה עיקרית', key: 1 },
    { id: 'location', label: 'פיזור — מיקום והקרנה', key: 1 },
    { id: 'onset', label: 'התחלה (Onset)', key: 1 },
    { id: 'mechanism', label: 'מנגנון פגיעה', key: 1 },
    { id: 'progression', label: 'התקדמות' },
    { id: 'duration', label: 'משך הזמן', key: 1 },
    { id: 'vas_max', label: 'עוצמת כאב מירבית (0–10)', key: 1, critical: 1 },
    { id: 'vas_now', label: 'עוצמת כאב עכשיו (0–10)', key: 1, critical: 1 },
    { id: 'daily_pattern', label: 'משך היום — דפוס יומי, נוקשות בוקר' },
    { id: 'night', label: 'שנת לילה וכאב לילי', key: 1, critical: 1 },
    { id: 'pain_type', label: 'סוג הכאב (עצבי / וסקולרי / נקודתי / מפושט)' },
    { id: 'quality', label: 'אופי הכאב (חד, שורף, לוחץ, עמום)' },
    { id: 'easing', label: 'מקל', key: 1 },
    { id: 'aggravating', label: 'מחמיר', key: 1 },
    { id: 'concordant', label: 'הסימן התואם (Concordant Sign)' }
  ]},
  { id: 'associated', title: 'סימפטומים נלווים', fields: [
    { id: 'swelling', label: 'נפיחות' },
    { id: 'mechanical', label: 'קליקים / תפיסות / נעילות' },
    { id: 'instability', label: 'חוסר יציבות' },
    { id: 'neuro_symptoms', label: 'נימול / הקרנה / חולשה', critical: 1 }
  ]},
  { id: 'function', title: 'תפקוד ומטרות', fields: [
    { id: 'function_limits', label: 'הגבלות תפקודיות — יומיום, עבודה, ספורט', key: 1 },
    { id: 'psfs', label: 'PSFS — 3 פעילויות ודירוג 0–10' },
    { id: 'goals', label: 'מטרות המטופל', key: 1 },
    { id: 'expectations', label: 'ציפיות מהטיפול' }
  ]},
  { id: 'history', title: 'היסטוריה', fields: [
    { id: 'medications', label: 'תרופות', key: 1, critical: 1 },
    { id: 'medical_history', label: 'היסטוריה (טראומה, ניתוח, שברים, נקעים, כאבים, מחלות)', key: 1 },
    { id: 'comorbidities', label: 'מחלות רקע' },
    { id: 'physical_history', label: 'היסטוריה גופנית (ספורט, תחביבים, עיסוק פיזי)', key: 1 },
    { id: 'imaging', label: 'הדמיה ותיעוד רפואי' }
  ]},
  { id: 'flags', title: 'דגלים', fields: [
    { id: 'red_flags', label: 'דגלים אדומים — מה נשאל ומה עלה', key: 1, critical: 1 },
    { id: 'yellow_flags', label: 'דגלים צהובים — פחד מתנועה, סטרס, ציפיות' }
  ]},
  { id: 'exam', title: 'בדיקה פיזיקלית', fields: [
    { id: 'observation', label: 'תצפית — יציבה, הליכה, נפיחות, אטרופיה', key: 1 },
    { id: 'palpation', label: 'מישוש' },
    { id: 'arom', label: 'AROM', key: 1, critical: 1 },
    { id: 'prom', label: 'PROM + End Feel', critical: 1 },
    { id: 'mmt', label: 'MMT (0–5)', critical: 1 },
    { id: 'neuro_exam', label: 'נוירולוגית — דרמטומים, מיוטומים, רפלקסים, ULTT / LLTT', critical: 1 },
    { id: 'special_tests', label: 'מבדקים מיוחדים (שם — צד — תוצאה)', key: 1, critical: 1 },
    { id: 'functional_tests', label: 'מבחנים תפקודיים' }
  ]},
  { id: 'summary', title: 'סיכום המפגש', fields: [
    { id: 'therapist_impression', label: 'התרשמות המטפל (כפי שנאמרה)' },
    { id: 'treatment_given', label: 'טיפול שניתן במפגש' },
    { id: 'home_program', label: 'תוכנית ביתית / תרגילים' },
    { id: 'plan_next', label: 'המשך ותיאום' }
  ]}
];
const FIELD = {};
FORM.forEach(sec => sec.fields.forEach(f => { FIELD[f.id] = { ...f, section: sec.id }; }));
const sectionsFor = s => FORM.filter(sec => !sec.only || sec.only === s.type);
const fieldsFor = s => sectionsFor(s).flatMap(sec => sec.fields);

/* ---------------- UI helpers ---------------- */
const ICON = (() => {
  const S = (d, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    gear: S('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    back: S('<path d="M9 18l6-6-6-6"/>', 2.2),
    chev: S('<path d="M15 6l-6 6 6 6"/>', 2),
    mic: S('<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4.5"/>', 2),
    stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    close: S('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 2),
    mark: '<svg class="mark" viewBox="0 0 32 24" aria-hidden="true"><ellipse cx="11.2" cy="12" rx="7.2" ry="9.6" transform="rotate(-14 11.2 12)" fill="currentColor" opacity=".6"/><ellipse cx="20.8" cy="12" rx="7.2" ry="9.6" transform="rotate(14 20.8 12)" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    focus: S('<path d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="2.5"/>'),
    pane: S('<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M9.5 4.5v15"/>'),
    map: S('<path d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z"/><path d="M9 4.5v12.7M15 6.8v12.7"/>'),
    theme: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
    live: S('<path d="M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10.5v3"/>', 2),
    form: S('<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/>'),
    chat: S('<path d="M15.5 9.5v-2a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h.5v2.5l3-2.5"/><path d="M11.5 12.5a2.5 2.5 0 0 1 2.5-2.5h4a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5h-.5v2l-2.5-2H14a2.5 2.5 0 0 1-2.5-2.5z"/>'),
    analysis: S('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/><path d="M12 10.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/>'),
    sparkles: S('<path d="M10 3.5l1.6 4.4L16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5l4.4-1.6z"/><path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>'),
    key: S('<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19.5 3.5M16 7l2.5 2.5M13.8 9.2l2 2"/>'),
    book: S('<path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5z"/><path d="M4.5 20.5A2.5 2.5 0 0 1 7 18h12.5v3H7"/>'),
    tray: S('<path d="M3.5 13.5 6 5h12l2.5 8.5V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>'),
    textformat: S('<path d="M3.5 18 8 6l4.5 12M5.2 14h5.6M14.5 18l3-8 3 8M15.5 15.5h4"/>'),
    person: S('<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>', 2.2),
    check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.2),
    alert: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.3v.2"/>', 2.2),
    note: S('<rect x="4.5" y="3.5" width="15" height="17" rx="3"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4"/>'),
    doc: S('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h5"/>'),
    send: S('<path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5"/>', 2.4),
    refresh: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>'),
    trash: S('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
    question: S('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.7M12 16.6v.2"/>', 2),
    tests: S('<path d="M4 6.5l1.5 1.5L8 5.5M4 12.5 5.5 14 8 11.5M4 18.5 5.5 20 8 17.5M11 7h9M11 13h9M11 19h9"/>'),
    figure: S('<circle cx="12" cy="4.5" r="2"/><path d="M12 7.5v6.5M7 9.5l5-1.5 5 1.5M9 21l3-7 3 7"/>', 2),
    clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', 2),
    angle: S('<path d="M4 20h16M4 20 15.5 5"/><path d="M10.5 20a6.5 6.5 0 0 0-2.2-4.8"/>', 2),
    dumbbell: S('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>', 2),
    bulb: S('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>'),
    drive: S('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', 2),
    clip: S('<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4"/>'),
    ext: S('<path d="M7 17 17 7M9 7h8v8"/>'),
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="8" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>'
  };
})();
let toastTimer = null;
function toast(msg, err = false, ms = 3800) {
  const host = $('#toastHost');
  host.innerHTML = `<div class="toast ${err ? 'err' : ''}" role="status">${esc(msg)}</div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { host.innerHTML = ''; }, ms);
}
/* ---------------- theme ---------------- */
const THEMES = [['auto', 'אוטומטי'], ['light', 'בהיר'], ['comfort', 'נוח לעין'], ['dark', 'כהה']];
const THEME_BG = { light: '#f2f2f7', dark: '#000000', comfort: '#ece7de' };
const DARK_MQ = matchMedia('(prefers-color-scheme: dark)');
// one theme for the whole site: the map and the app share localStorage 'uqmap-theme'
const THEME_KEY = 'uqmap-theme';
function getTheme() { try { const t = localStorage.getItem(THEME_KEY); return ['light', 'comfort', 'dark'].includes(t) ? t : 'auto'; } catch { return 'auto'; } }
function applyTheme() {
  const t = getTheme(), root = document.documentElement;
  const eff = t !== 'auto' ? t : (DARK_MQ.matches ? 'dark' : 'comfort'); // same default as the map
  if (t === 'auto' && eff === 'dark') delete root.dataset.theme; else root.dataset.theme = eff;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEME_BG[eff]);
}
function setTheme(t) {
  try { if (t === 'auto') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch { }
  themeChanged();
  $$('.seg-pick [data-theme]').forEach(b => b.classList.toggle('on', b.dataset.theme === t));
}
// Safari keeps painting the sticky transcript panel in the old theme until it is rebuilt, so rebuild it
function themeChanged() {
  applyTheme();
  requestAnimationFrame(() => { if (view === 'session' && session && $('#sidePane')) renderSide(); });
}
window.addEventListener('storage', e => { if (e.key === THEME_KEY) themeChanged(); });
DARK_MQ.addEventListener?.('change', themeChanged);
function autosize(t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
const fmtDate = iso => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
const fmtStamp = iso => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }; // file names (sort by date)
const fmtWhen = iso => { const d = new Date(iso); return `${fmtDate(iso)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`; }; // everything a person reads
const fmtClock = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };

/* ---------------- Claude API ---------------- */
const PRICE = { // $ per MTok: [input, output, cache-read multiplier]
  'claude-opus-5-5': [4, 20, 0.05], 'claude-sonnet-5-5': [2, 10, 0.05], 'claude-haiku-5-5': [0.1, 0.5, 0.1], 'claude-fable-5-1': [10, 50, 0.025]
};
function costOf(model, u) {
  if (!u) return 0;
  const p = PRICE[model] || [4, 20, 0.1];
  return ((u.input_tokens || 0) * p[0] + (u.cache_creation_input_tokens || 0) * p[0] * 1.25 +
    (u.cache_read_input_tokens || 0) * p[0] * p[2] + (u.output_tokens || 0) * p[1]) / 1e6;
}
function trackUsage(model, u) {
  if (!u) return 0;
  const cost = costOf(model, u);
  usage.total = (usage.total || 0) + cost; LS.set(K.usage, usage);
  if (session) { session.cost = (session.cost || 0) + cost; saveSession(); }
  return cost;
}
// Claude calls go through the site's own function (/api/claude), which holds the API key as a server secret
const CLAUDE_URL = path => new URL('../api/claude/' + path, location.href).href;
function apiErrText(status, msg) {
  if (status === 401) return /קוד גישה/.test(msg) ? 'קוד הגישה שגוי. בדוק אותו בהגדרות, בלשונית API.' : 'מפתח ה-API בשרת לא תקין (401)';
  if (status === 404 || status === 405) return 'שירות ה-AI של האתר לא נמצא. העוזר צריך לרוץ מהכתובת של האתר ב-Cloudflare.';
  if (status === 403) return 'אין הרשאה למודל או לחשבון (403): ' + msg;
  if (status === 429) return 'יותר מדי בקשות / אין יתרה (429): ' + msg;
  if (status === 503 && /השרת לא הוגדר/.test(msg)) return msg;
  if (status === 529 || status === 503) return 'השירות עמוס כרגע, נסה שוב בעוד רגע';
  return `שגיאת API ${status}: ${msg}`;
}
async function callClaude(body, { onText, signal } = {}) {
  if (!settings.accessCode) throw new Error('חסר קוד גישה. אפשר להוסיף אותו בהגדרות, בלשונית API.');
  const stream = !!onText;
  const resp = await fetch(CLAUDE_URL('messages'), {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'x-access-code': settings.accessCode },
    body: JSON.stringify({ ...body, stream })
  });
  if (!resp.ok) {
    let msg = resp.statusText;
    try { const j = await resp.json(); msg = (typeof j.error === 'string' ? j.error : j.error?.message) || msg; } catch { }
    const err = new Error(apiErrText(resp.status, msg)); err.status = resp.status; err.raw = msg; throw err;
  }
  if (!stream) { const j = await resp.json(); trackUsage(body.model, j.usage); return j; }
  const reader = resp.body.getReader(); const dec = new TextDecoder();
  let buf = '', text = '', u = {}, stop = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const data = chunk.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
      if (!data) continue;
      let ev; try { ev = JSON.parse(data); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { text += ev.delta.text; onText(text); }
      else if (ev.type === 'message_start') u = { ...(ev.message?.usage || {}) };
      else if (ev.type === 'message_delta') { if (ev.usage) u = { ...u, ...ev.usage }; stop = ev.delta?.stop_reason || stop; }
      else if (ev.type === 'error') throw new Error(ev.error?.message || 'שגיאה בזרם התשובה');
    }
  }
  const cost = trackUsage(body.model, u);
  return { text, stop_reason: stop, usage: u, cost };
}
async function countTokens(body) {
  const r = await fetch(CLAUDE_URL('messages/count_tokens'), {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-access-code': settings.accessCode }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('count_tokens ' + r.status);
  return (await r.json()).input_tokens;
}
// form filling runs in the background, so accuracy matters more than speed
function fillParams(model) {
  if (model.startsWith('claude-haiku')) return { thinking: { type: 'disabled' }, effort: 'medium' };
  return { effort: 'medium' };
}
// one retry without optional parameters if the API rejects them
async function callWithFallback(body, opts) {
  try { return await callClaude(body, opts); }
  catch (e) {
    if (e.status === 400 && /thinking|effort|output_config|format/i.test(e.raw || '')) {
      const b = { ...body }; delete b.thinking;
      if (b.output_config) { const oc = { ...b.output_config }; delete oc.effort; b.output_config = oc; }
      try { return await callClaude(b, opts); }
      catch (e2) {
        if (e2.status === 400 && b.output_config?.format) { const b2 = { ...b }; delete b2.output_config; return await callClaude(b2, opts); }
        throw e2;
      }
    }
    throw e;
  }
}
function parseJsonLoose(t) {
  try { return JSON.parse(t); } catch { }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch { } }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { } }
  return null;
}

/* ---------------- form auto-fill ---------------- */
function fillSchema(s) {
  return {
    type: 'object', additionalProperties: false, required: ['updates'],
    properties: {
      updates: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['id', 'value', 'quote', 'quote_source', 'uncertain'],
          properties: {
            id: { type: 'string', enum: fieldsFor(s).map(f => f.id) },
            value: { type: 'string' }, quote: { type: 'string' }, quote_source: { type: 'string', enum: ['patient', 'finding', 'question'] }, uncertain: { type: 'boolean' }
          }
        }
      }
    }
  };
}
// how Hebrew speech recognition tends to write English clinical terms (heard → meaning)
const ASR_GLOSSARY = `מבדק / מבדקים ← "מזדכים", "מזדקים", "מבדכים"
MMT ← "אם אם טי", "אמ טי", "הם אמיתי", "אמאמטי"
ROM / AROM / PROM ← "רום", "אי רום", "איי רום", "פי רום", "פרום"
VAS ← "ואס", "וי איי אס"
Empty Can (Jobe) ← "אמפטי קן", "אמפטי קאן", "אמפטן", "ג'וב"
Full Can ← "פול קן", "פולקן", "פול קאן"
Neer ← "ניר", "נייר"
Hawkins-Kennedy ← "הוקינס", "הוקינס קנדי"
Painful Arc ← "פיינפול ארק", "פיינפול"
Drop Arm ← "דרופ ארם", "דרופ"
Speed's ← "ספיד", "ספידס"
Yergason ← "ירגסון"
O'Brien ← "אובריין", "או בריין"
Apprehension / Relocation ← "אפריהנשן", "רילוקיישן"
Lift-off / Belly press ← "ליפט אוף", "בלי פרס"
Spurling ← "ספרלינג", "ספורלינג"
ULTT ← "יו אל טי טי"
Lachman ← "לכמן", "לחמן"
Anterior / Posterior Drawer ← "אנטריור דרואר", "מגירה קדמית", "מגירה אחורית"
McMurray ← "מקמארי", "מק מורי"
Thessaly ← "תסלי"
FABER / FADIR ← "פייבר", "פדיר", "פיידר"
SLR ← "אס אל אר", "הרמת רגל ישרה"
Phalen / Tinel / Finkelstein ← "פאלן", "טינל", "פינקלשטיין"
Mill's / Cozen's ← "מילס", "קוזנס"`;
let siteTestNames = []; // test names from the decision map, filled once the map is loaded
function loadTestNames() {
  if (siteTestNames.length) return;
  loadSite().then(st => { siteTestNames = Object.values(st.data.T || {}).map(t => t.n).filter(Boolean); }).catch(() => { });
}
function extractSystem(s) {
  const lines = sectionsFor(s).map(sec => `## ${sec.title}\n` + sec.fields.map(f => `- ${f.id} — ${f.label}`).join('\n')).join('\n');
  const names = siteTestNames.length ? `\n\nTest names used in the therapist's decision map (prefer these spellings):\n${siteTestNames.join(' · ')}` : '';
  return `You fill a structured clinical form for a sports therapist (ספורט-תרפיסט) in Israel, from a live Hebrew transcript of a clinical session.

The transcript is automatic speech recognition: frequent recognition errors, dropped words, English clinical terms written phonetically in Hebrew letters. Lines may start with a stage marker such as [שלב: בדיקה] and, when the recognizer separates voices, a speaker label such as [דובר 1]. Two speakers: the therapist (asks questions, says exam findings out loud) and the patient (answers). Often the therapist dictates alone.

Rules:
1. Record only what is actually in the transcript. Every test name, number, side and finding you write must be traceable to specific words in it. Never fill a field from general knowledge, never infer a diagnosis, never add a test that was not named.
2. Recognition errors: map a garbled term to a clinical term only when the sounds clearly match (see the list below), and then set "uncertain": true. If you cannot tell, write what was heard in quotes followed by "?" — e.g. "פולקן" (Full Can?). Never replace a heard term with a different test.
3. Do not reconstruct words or numbers that recognition dropped. E.g. "מתוך 5 בצד ימין" without the first number → "?/5 ימין" with "uncertain": true — never guess the missing number.
4. Return an update only for fields whose content changes because of the NEW transcript. "value" is the complete new content of that field: merge the current value with the new information. When the speaker explicitly corrects an earlier value, replace it and add "(תוקן)" — only if both the old and the new value appear in the transcript.
5. Write values in short, telegraphic clinical Hebrew. Keep standard English terms (VAS, AROM, MMT, Lachman, ULTT). Numbers as digits. State the side (ימין / שמאל / דו-צדדי) only when it was said. When both sides were measured, write them in one line, right first: "<motion>: ימין X · שמאל Y", e.g. "Flexion: ימין 150° (כאב) · שמאל 175°", one line per motion.
6. Pain intensity fields: the number 0–10 first, then short context, e.g. "7 (בירידה במדרגות)".
7. special_tests: one line per test that was actually named — "שם המבדק — צד — תוצאה — הערה". Write the side only when it was said for that test, otherwise leave that part out. The result as it was said: "חיובי" / "שלילי" only when the speaker said so or confirmed it; a score as said (e.g. "Beighton — 1/9"); otherwise the words that were said (e.g. "ללא כאב", "מתיחה בהמסטרינג בלבד"), never turned into positive or negative. A test that was not named never appears.
8. red_flags: one line per screening question actually asked, with the answer. A general statement such as "אין דגלים אדומים" is recorded as said, without inventing which questions were asked.
9. Fields marked LOCKED were edited by the therapist — never return updates for them.
10. "quote": copy the supporting words exactly as they appear in the NEW TRANSCRIPT, up to 15 words — no paraphrase and no correction of recognition errors. Quote the patient's own words, or the therapist stating a finding or an observation ("הוקינס חיובי מימין"). Never quote the therapist's question as the support: when the fact rests on a short answer to a question ("יש כאב בלילה?" — "כן"), quote the answer with the question and set "quote_source": "question". "quote_source": "patient" (the patient's words), "finding" (the therapist states a finding or observation) or "question" (only a question and a short answer support it). "uncertain": true when the recognition is garbled, a term was mapped through the list below, or it is unclear who said it.
11. Ignore small talk, logistics and anything that does not belong to a field. If nothing new belongs in the form, return an empty updates array.

Common recognition errors (meaning ← as heard):
${ASR_GLOSSARY}${names}

Form fields (id — label):
${lines}`;
}
function buildTranscript(segs) {
  let out = '', last = null;
  for (const g of segs) {
    if (g.stage !== last) { out += `\n[שלב: ${STAGES.find(x => x.id === g.stage)?.label || g.stage}]\n`; last = g.stage; }
    out += (g.speaker != null ? `[דובר ${g.speaker}] ` : '') + g.text + (g.manual ? ' (הוקלד ידנית)' : '') + '\n';
  }
  return out.trim();
}
function currentValues(s) {
  const o = {};
  for (const f of fieldsFor(s)) {
    const v = s.fields[f.id];
    if (v && v.value) o[f.id] = (v.locked ? '[LOCKED] ' : '') + v.value;
  }
  return o;
}
let filling = false, lastFillAt = 0, fillAbort = null;
function pendingChars() {
  if (!session) return 0;
  return session.segments.slice(session.processed).reduce((a, g) => a + g.text.length, 0);
}
function maybeFill(force = false) {
  if (!session || filling || !aiReady()) return;
  const chars = pendingChars();
  if (!chars) { if (force) setFillStatus('אין טקסט חדש למילוי'); return; }
  if (!force) {
    if (!settings.autoFill) return;
    const enough = chars >= (+settings.fillChars || 600);
    const stale = chars >= 40 && Date.now() - lastFillAt > 45000;
    if (!enough && !stale) return;
  }
  runFill();
}
async function runFill() {
  const s = session; if (!s) return;
  filling = true;
  const upto = s.segments.length;
  const fresh = s.segments.slice(s.processed, upto);
  const context = s.segments.slice(Math.max(0, s.processed - 8), s.processed);
  setFillStatus('<span class="spin"></span> ממלא את הטופס…', false, true);
  const user = `אזור: ${s.region} | סוג מפגש: ${s.type}

CURRENT FORM VALUES (JSON):
${JSON.stringify(currentValues(s), null, 1)}

EARLIER TRANSCRIPT (already processed — context only):
${buildTranscript(context) || '(אין)'}

NEW TRANSCRIPT (process this):
${buildTranscript(fresh)}`;
  const ll = fillParams(settings.extractModel);
  const body = {
    model: settings.extractModel, max_tokens: 6000,
    system: [{ type: 'text', text: extractSystem(s), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { effort: ll.effort, format: { type: 'json_schema', schema: fillSchema(s) } }
  };
  if (ll.thinking) body.thinking = ll.thinking;
  fillAbort = new AbortController();
  try {
    const res = await callWithFallback(body, { signal: fillAbort.signal });
    if (session !== s) return;
    const txt = (res.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const json = parseJsonLoose(txt);
    if (!json) throw new Error('התשובה לא הייתה JSON תקין');
    const n = applyUpdates(json.updates || [], buildTranscript(context.concat(fresh)));
    s.processed = upto; lastFillAt = Date.now(); saveSession(true);
    const d = new Date();
    setFillStatus(n ? `עודכנו ${n} שדות · ${pad(d.getHours())}:${pad(d.getMinutes())}` : `אין מידע חדש לטופס · ${pad(d.getHours())}:${pad(d.getMinutes())}`);
    if (n && smartAny()) runInsight();
  } catch (e) {
    if (e.name !== 'AbortError') setFillStatus(`המילוי נכשל: ${esc(humanErr(e))} <button class="linkbtn" data-act="fillNow">נסה שוב</button>`, true, true);
    lastFillAt = Date.now(); // back off before the next automatic attempt
  } finally {
    filling = false; fillAbort = null;
  }
}
// the model must quote the transcript; a quote that is not there marks the value as suspect
const normQ = t => String(t || '').replace(/[\u0591-\u05C7]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function quoteFound(quote, hay) {
  const q = normQ(quote); if (!q) return false;
  if (hay.includes(q)) return true;
  const words = q.split(' ').filter(w => w.length > 1); if (!words.length) return false;
  return words.filter(w => hay.includes(w)).length / words.length >= 0.75;
}
// a quote that is the therapist's question (or says so) is not the patient's words or a finding
const Q_START = /^(האם|מה|מתי|איפה|היכן|כמה|איך|למה|מדוע|יש לך|יש לכם|זה כואב|כואב לך|אתה מרגיש|את מרגישה|הרגשת)(?=[\s?,.]|$)/;
function isQuestionQuote(u) {
  if (u.quote_source === 'question') return true;
  const q = String(u.quote || '').trim();
  return /[?？]\s*$/.test(q) || Q_START.test(q.replace(/^[«"'״]+/, ''));
}
function applyUpdates(updates, transcriptText = '') {
  let n = 0; const changed = [];
  const hay = normQ(transcriptText);
  for (const u of updates) {
    const def = FIELD[u.id]; if (!def) continue;
    const cur = session.fields[u.id];
    if (cur && cur.locked) continue;
    const val = String(u.value || '').trim(); if (!val) continue;
    if (cur && cur.value === val) continue;
    if (cur && cur.rejected === val) continue; // the therapist undid exactly this value
    const verified = !hay || quoteFound(u.quote, hay);
    const asked = isQuestionQuote(u); // supported only by the therapist's question: the therapist confirms it
    session.fields[u.id] = { value: val, source: 'ai', quote: String(u.quote || '').trim(), needsCheck: !!(def.critical || u.uncertain || !verified || asked), unverified: !verified, asked, locked: false, at: Date.now() };
    session.recent = [{ id: u.id, at: Date.now(), prev: cur && cur.value ? { ...cur } : null }, ...(session.recent || []).filter(r => r.id !== u.id)].slice(0, 20);
    n++; changed.push(u.id);
    refreshField(u.id, true);
  }
  if (n) { markDirty(changed); syncStage(); touch(); refreshLive(); refreshCounts(); updateIsland(true); }
  return n;
}

/* ---------------- smart tools: live record, notes, clinical graphics, next steps ----------------
   After each fill that changed the form (and after a new note), one more call turns the form into views:
   the record's paragraphs, where the symptoms are, the injury's course, the exam findings, working
   hypotheses from the decision map, and (BETA) what to ask or test next. The input is the form itself,
   so every item points back to fields, and each field points back to the transcript words it came from. */
const SMART_DEFAULT = { record: true, notes: true, body: true, timeline: true, exam: true, hypo: true, next: false };
const smart = () => ({ ...SMART_DEFAULT, ...(settings.smart || {}) });
const aiReady = () => !!settings.accessCode;
const smartGraphics = () => { const m = smart(); return m.body || m.timeline || m.exam || m.hypo; };
const smartAny = () => { const m = smart(); return Object.values(m).some(Boolean); };
const PART_FIELDS = {
  body: ['location', 'chief_complaint', 'neuro_symptoms', 'pain_type', 'quality'],
  timeline: ['onset', 'mechanism', 'duration', 'progression', 'changes', 'lead_sign', 'daily_pattern', 'response', 'medical_history', 'imaging'],
  exam: ['arom', 'prom', 'mmt', 'special_tests', 'neuro_exam', 'functional_tests']
};
const BODY_ZONES = ['head', 'neck', 'shoulder', 'upper_arm', 'elbow', 'forearm', 'wrist_hand', 'chest', 'upper_back', 'abdomen', 'low_back', 'hip', 'thigh', 'knee', 'lower_leg', 'ankle_foot'];
const ZONE_HE = { head: 'ראש', neck: 'צוואר', shoulder: 'כתף', upper_arm: 'זרוע', elbow: 'מרפק', forearm: 'אמה', wrist_hand: 'שורש כף יד וכף יד', chest: 'חזה', upper_back: 'גב עליון', abdomen: 'בטן', low_back: 'גב תחתון', hip: 'ירך ואגן', thigh: 'ירך', knee: 'ברך', lower_leg: 'שוק', ankle_foot: 'קרסול וכף רגל' };
const KIND_HE = { pain: 'כאב', radiation: 'הקרנה', paresthesia: 'נימול / עקצוץ' };
const KIND_VAR = { pain: '--bm-pain', radiation: '--bm-rad', paresthesia: '--bm-par' };
const SIDE_HE = { right: 'ימין', left: 'שמאל', both: 'דו-צדדי', center: '', none: '' };
const STATUS_HE = { supported: 'נתמכת', possible: 'אפשרית', weakened: 'נחלשה' };
const RESULT_HE = { positive: 'חיובי', negative: 'שלילי', equivocal: 'לא חד-משמעי', score: 'ציון', text: 'כפי שנאמר' };
const TEST_RESULTS = Object.keys(RESULT_HE);
const resultText = t => (t.result === 'score' || t.result === 'text') ? (t.value || 'לא צוינה תוצאה') : RESULT_HE[t.result] || 'לא צוינה תוצאה';
// pain level states on the course chart; items stored before states existed read as unspecified
const PAIN_STATES = ['rest', 'activity', 'night', 'unspecified'];
const PAIN_STATE_HE = { rest: 'במנוחה', activity: 'בפעילות', night: 'בלילה', unspecified: '' };
// normal ranges live in norms.js (editable); a movement is looked up in its joint, else in the region's joints
const NORMS = window.ROM_NORMS || { joints: {}, regions: {} };
const ROM_JOINTS = Object.keys(NORMS.joints || {});
const normName = t => ' ' + String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
function romNorm(motion, joint, region) {
  const name = normName(motion), joints = ROM_JOINTS.includes(joint) ? [joint] : (NORMS.regions?.[region] || []);
  for (const j of joints) {
    let best = null, len = 0;
    for (const m of NORMS.joints[j]?.motions || []) for (const a of m.names || []) {
      const n = normName(a); if (n.length > len && name.includes(n)) { best = m; len = n.length; }
    }
    if (best) return best.deg > 0 ? { deg: best.deg, joint: j } : null;
  }
  return null;
}

function insState(s = session) { return s.ins || (s.ins = { record: {}, body: [], timeline: [], exam: { rom: [], mmt: [], tests: [] }, hypo: [], next: [], at: {} }); }
function markDirty(ids) {
  const s = session; if (!s) return;
  const d = s.insDirty || (s.insDirty = { secs: [], parts: [] });
  for (const id of ids) {
    const sec = FIELD[id]?.section; if (sec && !d.secs.includes(sec)) d.secs.push(sec);
    for (const [p, fs] of Object.entries(PART_FIELDS)) if (fs.includes(id) && !d.parts.includes(p)) d.parts.push(p);
    if (!d.parts.includes('reason')) d.parts.push('reason');
  }
}
function markDirtyAll() { if (session) markDirty(fieldsFor(session).filter(f => session.fields[f.id]?.value).map(f => f.id)); }
const hasAnyField = ids => ids.some(id => session.fields[id]?.value);

// the therapist's decision map for this region: its pathways, each with the tests that tell it apart
const catalogCache = new Map();
async function mapCatalog(region) {
  if (catalogCache.has(region)) return catalogCache.get(region);
  const st = await loadSite(); siteData = st.data;
  const T = st.data.T || {}, r = st.data.REGIONS.find(x => x.id === MAP_TAB[region]);
  const lines = [];
  if (r?.s3?.patterns) for (const p of r.s3.patterns) {
    lines.push(`# ${p.title}`);
    for (const x of p.paths || []) lines.push(`- ${x.n} — tests: ${(x.tests || []).join(', ') || '—'}`);
  }
  const cat = {
    text: (lines.length ? `Pathways on the map for this region (path — catalog test ids):\n${lines.join('\n')}\n\n` : 'This region has no pathways on the map yet; name hypotheses in standard clinical terms and leave "path" empty.\n\n') +
      `Catalog tests (id: name):\n${Object.entries(T).map(([id, t]) => `${id}: ${t.n}`).join('\n')}`,
    ids: new Set(Object.keys(T)), paths: new Set((r?.s3?.patterns || []).flatMap(p => (p.paths || []).map(x => x.n)))
  };
  catalogCache.set(region, cat); return cat;
}

const INSIGHT_SYSTEM = `You prepare live views of a sports-therapy session for the therapist's tablet, from the session form (filled from a live Hebrew transcript) and the therapist's own notes. Fill only the parts present in the output schema.

Ground rules:
1. Use only the form values and notes you are given. Never add a finding, number, side, test, history or diagnosis that is not in them. Every item lists in "fields" the form field ids it comes from.
2. Values marked [לא אומת] may contain recognition errors. You may use them as written; never "correct" them.
3. Hebrew, short and clinical. Keep English test names, abbreviations and units (AROM, MMT, VAS, °).

Parts:
- record: for each section id in RECORD_SECTIONS that has content, one paragraph of the clinical record: 1–3 sentences of fluent clinical Hebrew in the third person ("המטופל מדווח…", "נמצא…"), only the facts in that section's fields. No headings, no lists, no interpretation.
- notes: for each pending therapist note (by id): "field" = the form field id the note belongs in (it will be appended there), or "" when it is not a fact for the form; "task" = when the note is something to do, check or remember later (e.g. "לבדוק Hawkins", "לשלוח הפניה"), a short imperative task in Hebrew, else "". A note can be both or neither.
- body: where the symptoms are, from location / chief_complaint / neuro_symptoms: one item per zone and side. kind: pain = the pain itself; radiation = pain that spreads or radiates to another area; paresthesia = numbness, tingling, pins and needles. view: front / back / both, by where on the body it was described (both when not said). side: right / left / both / center (center for the spine, head, chest and abdomen when no side was said). label: 2–5 Hebrew words as said.
- timeline: the injury story in time order: onset, mechanism, changes, earlier episodes, treatments, imaging. "when" as said, in Hebrew. "days_ago": your numeric estimate before the session date (a week = 7, a month = 30, a year = 365); -1 when no time was given; events said to be on the same day get the same number. "event": up to 6 Hebrew words. "vas": the pain level 0–10 at that time when one was said for it (e.g. "בהתחלה 8"), else -1. "pain_state": what the level was measured in, as said — rest (במנוחה, בישיבה), activity (בתנועה, בריצה, במדרגות, באימון, בהרמה), night (בלילה, בשינה), or unspecified; unspecified when there is no level. When levels were given for more than one state at the same time, one item per state. Today's levels (vas_now, and vas_max only when it was said to be today) are items too: days_ago 0, when "היום", event e.g. "כאב במנוחה", one per state.
- exam: rom = each range of motion given in degrees, one item per motion and side ("motion" short, e.g. "Flexion" or "סיבוב חיצוני"; "joint" = the joint it was measured at, or "other" when unclear; painful = pain was reported at that range); mmt = each muscle or motion with a 0–5 grade (4+ = 4.5, 4- = 3.75); tests = each special test that was named, with its result. side (all three): right / left only when that side was stated for this item, otherwise "none" (tests may also be "both"); never take the side from the complaint. Test result: positive / negative only when the form says חיובי / שלילי for it (said or confirmed); equivocal when it says unclear (לא ברור, לא חד-משמעי); score when the result is a number or score — "value" = the score as written, e.g. "1/9"; text for any other result — "value" = the words as written, e.g. "ללא כאב"; "value" is "" for positive / negative / equivocal. test_id = the catalog id when the test is in the MAP CATALOG, else "". Nothing that was not measured or named.
- hypotheses: 2–4 working hypotheses the findings so far point to, for the therapist's own reasoning and never as a diagnosis. Start as soon as the complaint, its location and one more relevant fact (onset, mechanism, aggravating factor, an exam finding) are known; early on most will be "possible". Prefer the pathways in the MAP CATALOG ("path" = its exact name, "" when not from the map). status: supported = several findings fit and none argue against; possible = fits but still untested; weakened = a finding argues against it. support / against: up to 3 short facts each, from the form. tests: catalog test ids that would help tell these hypotheses apart and were not done yet. Return an empty list only when there is no complaint or location yet.
- next: up to 3 next steps for the current stage that matter most now: kind "question" (to ask) or "test" (to examine); text = the question in Hebrew as the therapist would ask it, or the test's name; why = up to 10 Hebrew words; test_id = catalog id or "". Prefer key items not yet asked and what tells the hypotheses apart. Never something already in the form.`;

function insightSchema(parts) {
  const ids = fieldsFor(session).map(f => f.id), fieldsArr = { type: 'array', items: { type: 'string', enum: ids } };
  const obj = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props });
  const arr = item => ({ type: 'array', items: item });
  const P = {};
  for (const p of parts) {
    if (p === 'record') P.record = arr(obj({ section: { type: 'string', enum: sectionsFor(session).map(x => x.id) }, text: { type: 'string' }, fields: fieldsArr }));
    if (p === 'notes') P.notes = arr(obj({ id: { type: 'string' }, field: { type: 'string', enum: ['', ...ids] }, task: { type: 'string' } }));
    if (p === 'body') P.body = arr(obj({ zone: { type: 'string', enum: BODY_ZONES }, side: { type: 'string', enum: ['right', 'left', 'both', 'center'] }, view: { type: 'string', enum: ['front', 'back', 'both'] }, kind: { type: 'string', enum: ['pain', 'radiation', 'paresthesia'] }, label: { type: 'string' }, fields: fieldsArr }));
    if (p === 'timeline') P.timeline = arr(obj({ when: { type: 'string' }, days_ago: { type: 'number' }, event: { type: 'string' }, vas: { type: 'number' }, pain_state: { type: 'string', enum: PAIN_STATES }, fields: fieldsArr }));
    if (p === 'exam') P.exam = obj({
      rom: arr(obj({ motion: { type: 'string' }, joint: { type: 'string', enum: [...ROM_JOINTS, 'other'] }, side: { type: 'string', enum: ['right', 'left', 'none'] }, degrees: { type: 'number' }, painful: { type: 'boolean' }, fields: fieldsArr })),
      mmt: arr(obj({ motion: { type: 'string' }, side: { type: 'string', enum: ['right', 'left', 'none'] }, grade: { type: 'number' }, fields: fieldsArr })),
      tests: arr(obj({ name: { type: 'string' }, test_id: { type: 'string' }, side: { type: 'string', enum: ['right', 'left', 'both', 'none'] }, result: { type: 'string', enum: TEST_RESULTS }, value: { type: 'string' }, fields: fieldsArr }))
    });
    if (p === 'hypo') P.hypotheses = arr(obj({ name: { type: 'string' }, path: { type: 'string' }, status: { type: 'string', enum: ['supported', 'possible', 'weakened'] }, support: arr({ type: 'string' }), against: arr({ type: 'string' }), tests: arr({ type: 'string' }) }));
    if (p === 'next') P.next = arr(obj({ kind: { type: 'string', enum: ['question', 'test'] }, text: { type: 'string' }, why: { type: 'string' }, test_id: { type: 'string' } }));
  }
  return obj(P);
}
let insighting = false, insightAgain = false;
const HYPO_MIN = 3; // filled fields (besides the name) before hypotheses are worth asking for
// force: every part from scratch; only: just these parts now (the hypotheses button)
async function runInsight(force = false, only = null) {
  const s = session; if (!s || !aiReady() || !smartAny()) return;
  if (insighting) { if (only) toast('העדכון הקודם עוד רץ. נסה שוב בעוד רגע.', false, 2200); else insightAgain = true; return; }
  const sm = smart(), d = JSON.parse(JSON.stringify(s.insDirty || { secs: [], parts: [] }));
  const pending = (s.notes || []).filter(n => n.status === 'pending'), sent = new Set(pending.map(n => n.id));
  const filled = fieldsFor(s).filter(f => f.id !== 'name' && s.fields[f.id]?.value);
  const secsWith = sectionsFor(s).filter(sec => sec.fields.some(f => f.id !== 'name' && s.fields[f.id]?.value)).map(sec => sec.id);
  const recSecs = sm.record ? (force ? secsWith : d.secs.filter(x => secsWith.includes(x))) : [];
  const want = p => force || d.parts.includes(p);
  const parts = [];
  if (only) parts.push(...only.filter(p => p !== 'hypo' || filled.length >= HYPO_MIN));
  else {
  if (recSecs.length) parts.push('record');
  if (sm.notes && pending.length) parts.push('notes');
  if (sm.body && want('body') && hasAnyField(PART_FIELDS.body)) parts.push('body');
  if (sm.timeline && want('timeline') && hasAnyField(PART_FIELDS.timeline)) parts.push('timeline');
  if (sm.exam && want('exam') && hasAnyField(PART_FIELDS.exam)) parts.push('exam');
  if (sm.hypo && want('reason') && filled.length >= HYPO_MIN) parts.push('hypo');
  if (sm.next && want('reason') && filled.length >= 1) parts.push('next');
  }
  if (!parts.length) { if (force) { s.insDirty = { secs: [], parts: [] }; refreshLive(); } return; }
  insighting = true; refreshLive();
  let cat = null;
  if (parts.some(p => ['exam', 'hypo', 'next'].includes(p))) { try { cat = await mapCatalog(s.region); } catch { } }
  const form = {};
  for (const f of filled) { const v = s.fields[f.id]; form[f.id] = (v.unverified || v.needsCheck ? '[לא אומת] ' : '') + v.value; }
  const empties = missingFields(s).filter(x => x.imp <= 2).map(x => x.f.id);
  const user = `אזור: ${s.region} | סוג מפגש: ${s.type} | שלב נוכחי: ${stageLabel(s.stage)} | תאריך המפגש: ${fmtDate(s.startedAt)}

FORM SECTIONS (section id — title: field id — label):
${sectionsFor(s).map(sec => `${sec.id} — ${sec.title}: ${sec.fields.map(f => `${f.id} — ${shortLabel(f.label)}`).join('; ')}`).join('\n')}

FORM VALUES (JSON):
${JSON.stringify(form, null, 1)}
${parts.includes('record') ? `\nRECORD_SECTIONS: ${recSecs.join(', ')}` : ''}${parts.includes('notes') ? `\nPENDING NOTES (JSON): ${JSON.stringify(pending.map(n => ({ id: n.id, text: n.text })))}` : ''}${parts.includes('next') ? `\nSTILL EMPTY in the current stage, most important first: ${empties.join(', ') || '—'}` : ''}${cat ? `\n\nMAP CATALOG\n${cat.text}` : ''}`;
  const ll = fillParams(settings.extractModel);
  const body = {
    model: settings.extractModel, max_tokens: 16000,
    system: [{ type: 'text', text: INSIGHT_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { effort: ll.effort === 'medium' ? 'low' : ll.effort, format: { type: 'json_schema', schema: insightSchema(parts) } }
  };
  if (ll.thinking) body.thinking = ll.thinking;
  try {
    const res = await callWithFallback(body);
    if (session !== s) return;
    const json = parseJsonLoose((res.content || []).filter(b => b.type === 'text').map(b => b.text).join(''));
    if (!json) throw new Error(res.stop_reason === 'max_tokens' ? 'התשובה נקטעה באורך המקסימלי' : 'התשובה לא הייתה JSON תקין');
    applyInsight(s, json, parts, recSecs, cat, sent);
    // only what was sent is clean now; anything that changed during the call stays dirty
    const cur = s.insDirty || { secs: [], parts: [] };
    if (!only) s.insDirty = { secs: cur.secs.filter(x => !recSecs.includes(x)), parts: cur.parts.filter(p => !(d.parts.includes(p) || force)) };
    saveSession(true);
  } catch (e) {
    if (e.name !== 'AbortError') { toast('עדכון הרשומה והגרפיקה נכשל: ' + humanErr(e), true, 5000); (s.notes || []).forEach(n => { if (sent.has(n.id) && n.status === 'pending') n.status = 'kept'; }); }
  } finally {
    insighting = false; refreshLive(); if (view === 'finish') renderFinish();
    if (insightAgain) { insightAgain = false; setTimeout(() => runInsight(), 300); }
  }
}
const pick = (v, allowed, dflt = '') => allowed.includes(v) ? v : dflt;
const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const str = (v, max = 400) => String(v ?? '').slice(0, max);
const TEST_ID = /^[a-z0-9_-]{1,40}$/i;
function applyInsight(s, j, parts, recSecs, cat, sent = new Set()) {
  const ins = insState(s), now = Date.now(), okF = a => (Array.isArray(a) ? a : []).filter(id => FIELD[id]);
  if (parts.includes('record') && Array.isArray(j.record)) {
    for (const r of j.record) if (recSecs.includes(r?.section) && typeof r.text === 'string' && r.text.trim()) ins.record[r.section] = { text: str(r.text.trim(), 1600), fields: okF(r.fields), at: now };
    ins.at.record = now;
  }
  if (parts.includes('notes') && Array.isArray(j.notes)) {
    for (const x of j.notes) {
      const n = (s.notes || []).find(y => y.id === x.id && y.status === 'pending'); if (!n) continue;
      if (x.field && FIELD[x.field] && x.field !== 'name') {
        const cur = s.fields[x.field] || {}, line = 'פתק: ' + n.text;
        s.fields[x.field] = cur.value ? { ...cur, value: cur.value + '\n' + line } : { value: line, source: 'note', locked: false, at: now };
        n.field = x.field; markDirty([x.field]);
      }
      if (typeof x.task === 'string' && x.task.trim()) { n.task = str(x.task.trim(), 160); n.done = false; }
      n.status = n.field || n.task ? 'filed' : 'kept';
    }
    (s.notes || []).forEach(n => { if (sent.has(n.id) && n.status === 'pending') n.status = 'kept'; });
    syncStage(); touch(); refreshCounts();
  }
  if (parts.includes('body') && Array.isArray(j.body)) {
    ins.body = j.body.filter(b => BODY_ZONES.includes(b?.zone) && KIND_HE[b.kind]).map(b => ({ zone: b.zone, kind: b.kind, side: pick(b.side, ['right', 'left', 'both', 'center'], 'center'), view: pick(b.view, ['front', 'back', 'both'], 'both'), label: str(b.label, 80), fields: okF(b.fields) }));
    ins.at.body = now;
  }
  if (parts.includes('timeline') && Array.isArray(j.timeline)) {
    ins.timeline = j.timeline.filter(t => t?.event).map(t => ({ when: str(t.when, 60), days_ago: num(t.days_ago, 0, 36500) ?? -1, event: str(t.event, 120), vas: num(t.vas, 0, 10) ?? -1, pain_state: pick(t.pain_state, PAIN_STATES, 'unspecified'), fields: okF(t.fields) }));
    ins.at.timeline = now;
  }
  if (parts.includes('exam') && j.exam) {
    const tid = id => cat?.ids.has(id) && TEST_ID.test(id) ? id : '';
    const arr = a => Array.isArray(a) ? a : [];
    ins.exam = {
      rom: arr(j.exam.rom).filter(r => num(r?.degrees, -90, 360) != null).map(r => ({ motion: str(r.motion, 60), joint: pick(r.joint, ROM_JOINTS, ''), side: pick(r.side, ['right', 'left', 'none'], 'none'), degrees: num(r.degrees, -90, 360), painful: !!r.painful, fields: okF(r.fields) })),
      mmt: arr(j.exam.mmt).filter(r => num(r?.grade, 0, 5) != null).map(r => ({ motion: str(r.motion, 60), side: pick(r.side, ['right', 'left', 'none'], 'none'), grade: num(r.grade, 0, 5), fields: okF(r.fields) })),
      tests: arr(j.exam.tests).filter(t => t?.name).map(t => ({ name: str(t.name, 80), test_id: tid(t.test_id), side: pick(t.side, ['right', 'left', 'both', 'none'], 'none'), result: pick(t.result, TEST_RESULTS, 'text'), value: str(t.value, 80), fields: okF(t.fields) }))
    };
    ins.at.exam = now;
  }
  if (parts.includes('hypo') && Array.isArray(j.hypotheses)) {
    ins.hypo = j.hypotheses.filter(h => h?.name).slice(0, 4).map(h => ({ name: str(h.name, 120), path: cat?.paths.has(h.path) ? h.path : '', status: pick(h.status, Object.keys(STATUS_HE), 'possible'),
      support: (Array.isArray(h.support) ? h.support : []).slice(0, 3).map(x => str(x, 140)), against: (Array.isArray(h.against) ? h.against : []).slice(0, 3).map(x => str(x, 140)),
      tests: (Array.isArray(h.tests) ? h.tests : []).filter(t => TEST_ID.test(t) && (!cat || cat.ids.has(t))).slice(0, 4) }));
    ins.at.hypo = now;
  }
  if (parts.includes('next') && Array.isArray(j.next)) { ins.next = j.next.filter(x => x?.text).slice(0, 3).map(x => ({ kind: pick(x.kind, ['question', 'test'], 'question'), text: str(x.text, 160), why: str(x.why, 100), test_id: cat?.ids.has(x.test_id) && TEST_ID.test(x.test_id) ? x.test_id : '' })); ins.at.next = now; }
}
function unfileNote(nid) {
  const n = (session?.notes || []).find(x => x.id === nid); if (!n || !n.field) return;
  const f = session.fields[n.field], line = 'פתק: ' + n.text;
  if (f?.value) { const v = f.value.split('\n').filter(l => l !== line).join('\n').trim(); session.fields[n.field] = v ? { ...f, value: v } : { value: '', locked: false }; }
  markDirty([n.field]); n.field = ''; n.status = n.task ? 'filed' : 'kept';
  touch(); refreshCounts(); refreshLive();
}

/* ---------------- clinical graphics ---------------- */
const unvOf = (s, ids) => (ids || []).some(id => s.fields[id]?.unverified); // the model quoted words that are not in the transcript
const chkOf = (s, ids) => (ids || []).some(id => s.fields[id]?.needsCheck || s.fields[id]?.unverified);
const UNV = ' <span class="badge bad">לא נמצא בתמלול</span>';
function vizCards(stage, summary) {
  const sm = smart(), s = session, ins = insState(s), out = [];
  const has = { course: vasOf(s.fields.vas_max?.value) != null || vasOf(s.fields.vas_now?.value) != null || ins.timeline.length,
    body: ins.body.length, exam: ins.exam.rom.length + ins.exam.mmt.length + ins.exam.tests.length, hypo: ins.hypo.length };
  const order = stage === 'exam' ? ['exam', 'hypo', 'body', 'course'] : stage === 'summary' ? ['hypo', 'exam', 'course', 'body'] : stage === 'all' ? ['course', 'body', 'exam', 'hypo'] : ['course', 'body', 'hypo'];
  const on = { course: sm.timeline, body: sm.body, exam: sm.exam, hypo: sm.hypo };
  // the empty hypotheses card (with its button) shows once there is enough to reason from
  const emptyOk = k => k !== 'hypo' || stage !== 'anamnesis' || filledCount(s) >= HYPO_MIN;
  for (const k of order) {
    if (!on[k]) continue;
    if (!has[k]) { if (!summary && emptyOk(k) && (stage === 'anamnesis' ? ['course', 'body', 'hypo'] : stage === 'exam' ? ['exam', 'hypo'] : ['hypo']).includes(k)) out.push(emptyCard(k)); continue; }
    out.push(k === 'course' ? courseCard() : k === 'body' ? bodyCard() : k === 'exam' ? examCard() : hypoCard(true));
  }
  return out;
}
const CARD = {
  course: ['cat-time', 'clock', 'מהלך הפציעה', 'יופיע כשיוזכרו תחילת הכאב, מנגנון או עוצמה'],
  body: ['cat-body', 'figure', 'מפת גוף', 'יופיע כשיוזכרו מיקום הכאב או הקרנה'],
  exam: ['cat-mob', 'angle', 'ממצאי בדיקה', 'יופיע כשייאמרו טווחים, כוח או תוצאות מבדקים'],
  hypo: ['cat-hyp', 'bulb', 'לוח השערות', 'יופיע אחרי כמה ממצאים מהשיחה']
};
function cardHead(k, end = '') { const [cls, ic, title] = CARD[k]; return `<div class="card-h ${cls}"><span class="glyph">${ICON[ic]}</span><h2>${title}</h2>${end ? `<span class="end">${end}</span>` : ''}</div>`; }
function emptyCard(k) {
  const [cls, ic, title, hint] = CARD[k];
  if (k === 'hypo') return `<section class="card compact hypo-empty"><div class="card-h ${cls}"><span class="glyph">${ICON[ic]}</span><h2>${title}</h2><span class="end">${hypoBtn()}</span></div><span class="hint">${insighting ? '<span class="spin"></span>' : hypoHint()}</span></section>`;
  return `<section class="card compact"><div class="card-h ${cls}"><span class="glyph">${ICON[ic]}</span><h2>${title}</h2></div><span class="hint">${insighting ? '<span class="spin"></span>' : hint}</span></section>`;
}
const filledCount = s => fieldsFor(s).filter(f => f.id !== 'name' && s.fields[f.id]?.value).length;
// the board is drawn by the same background update as the other graphics, not by "הפק ניתוח"
function hypoHint() {
  const s = session, n = filledCount(s), at = insState(s).at.hypo;
  if (!aiReady()) return 'נדרש קוד גישה בהגדרות, בלשונית API.';
  if (n < HYPO_MIN) return `מתעדכן לבד אחרי ${HYPO_MIN} שדות מלאים בטופס (עכשיו ${n}). לא תלוי ב"הפק ניתוח".`;
  if (at) return `בעדכון האחרון (${hhmm(at)}) עוד לא היו מספיק ממצאים להשערות. מתעדכן לבד כשנוסף מידע לטופס.`;
  return 'מתעדכן לבד אחרי כל מילוי של הטופס. אפשר גם לחשב עכשיו.';
}
const hypoBtn = (label = 'חשב השערות') => aiReady() && filledCount(session) >= HYPO_MIN ? `<button class="btn sm" data-act="hypoNow"${insighting ? ' disabled' : ''}>${label}</button>` : '';
// a card's corner: when it was drawn, and "לאמת" while any field it draws from still waits for the therapist
const CARD_SRC = { timeline: s => [...PART_FIELDS.timeline, 'vas_max', 'vas_now'], body: () => PART_FIELDS.body, exam: () => PART_FIELDS.exam, hypo: () => [] };
const atMeta = k => {
  const s = session, d = s.insDirty?.parts || [], t = insState().at[k];
  const chk = chkOf(s, CARD_SRC[k](s).filter(id => s.fields[id]?.value)) ? `<button class="badge chk" data-act="verifyPart" data-part="${k}">לאמת</button>` : '';
  return chk + (insighting ? '<span class="meta"><span class="spin"></span></span>' : t ? `<span class="meta">${d.includes(k === 'hypo' ? 'reason' : k) ? 'יתעדכן' : hhmm(t)}</span>` : '');
};
function vasOf(v) { const m = String(v || '').match(/(\d+(?:\.\d+)?)/); if (!m) return null; const n = +m[1]; return n >= 0 && n <= 10 ? n : null; }
const vasCtx = v => String(v || '').replace(/^[^\d]*\d+(?:\.\d+)?\s*(?:\/\s*10)?/, '').replace(/[()]/g, ' ').replace(/^[\s,:;·–—-]+/, '').replace(/\s+([;,.:])/g, '$1').replace(/\s{2,}/g, ' ').trim();

function courseCard() {
  const s = session, d = courseData(s);
  const states = PAIN_STATES.filter(st => d.pain.some(p => p.st === st));
  const multi = states.length > 1;
  const ctx = [d.vmax != null && vasCtx(s.fields.vas_max.value) ? `שיא <bdi dir="ltr">${d.vmax}/10</bdi>: ${esc(vasCtx(s.fields.vas_max.value))}` : '', d.vnow != null && vasCtx(s.fields.vas_now.value) ? `עכשיו <bdi dir="ltr">${d.vnow}/10</bdi>: ${esc(vasCtx(s.fields.vas_now.value))}` : ''].filter(Boolean);
  const legend = [...states.map(st => `<span><svg class="mk" viewBox="0 0 12 12" aria-hidden="true">${painMark(st, 6, 6, 4.5, '', ringed(d.pain))}</svg>${multi || st !== 'unspecified' ? 'כאב ' + (PAIN_STATE_HE[st] || 'ללא מצב') : 'כאב'} <bdi dir="ltr">(0–10)</bdi></span>`),
    d.vmax != null && !d.pain.some(p => p.v === d.vmax) ? `<span><i class="ln dash" style="--k:var(--pink)"></i>שיא שדווח</span>` : '',
    d.events.length ? `<span><i style="--k:var(--purple);border-radius:50%"></i>אירועים</span>` : ''].filter(Boolean);
  const al = ['מהלך הפציעה', ...d.events.map(e => `${e.when}: ${e.items.map(t => t.event).join(', ')}`), ...d.pain.map(p => `${p.d ? agoLabel(p.d) : 'היום'}: כאב ${PAIN_STATE_HE[p.st] ? PAIN_STATE_HE[p.st] + ' ' : ''}${p.v}`), d.vmax != null ? 'שיא כאב ' + d.vmax : ''].filter(Boolean).join('; ');
  return `<section class="card">${cardHead('course', atMeta('timeline'))}
    ${legend.length ? `<div class="legend" style="margin:0 0 4px">${legend.join('')}</div>` : ''}
    ${chartSlot('tl', w => courseSvg(d, w), al)}
    ${d.undated.length ? `<p class="fine">בלי זמן: ${d.undated.map(t => esc(t.event) + (unvOf(s, t.fields) ? ' (לא נמצא בתמלול)' : '')).join(' · ')}</p>` : ''}
    ${ctx.length ? `<p class="fine">${ctx.join(' · ')}</p>` : ''}</section>`;
}
// pain says what state it was measured in (rest / activity / night) when the timeline item does not
function painState(t) {
  t = String(t || '');
  if (/מנוחה|ישיבה|שכיבה|בשקט/.test(t)) return 'rest';
  if (/לילה|שינה|כשישן|בבוקר כשמתעורר/.test(t)) return 'night';
  if (/תנועה|פעילות|ריצה|מדרגות|אימון|הרמה|הליכה|משחק|ספורט|זריקה|קפיצה|מאמץ|עומס/.test(t)) return 'activity';
  return 'unspecified';
}
function courseData(s) {
  const ins = insState(s), vmax = vasOf(s.fields.vas_max?.value), vnow = vasOf(s.fields.vas_now?.value);
  const dated = ins.timeline.filter(t => t.days_ago >= 0), st = t => PAIN_STATES.includes(t.pain_state) ? t.pain_state : 'unspecified';
  const pain = dated.filter(t => t.vas >= 0).map(t => ({ d: t.days_ago, v: t.vas, st: st(t), unv: unvOf(s, t.fields) }));
  if (vnow != null && !pain.some(p => p.d === 0)) pain.push({ d: 0, v: vnow, st: painState(s.fields.vas_now.value), unv: unvOf(s, ['vas_now']) });
  // events of the same day share one mark; a pain level said for today sits on the pain series only
  const days = new Map();
  for (const t of dated) {
    if (t.days_ago === 0 && t.vas >= 0) continue;
    if (!days.has(t.days_ago)) days.set(t.days_ago, { d: t.days_ago, when: t.when, items: [] });
    const g = days.get(t.days_ago); if (!g.items.some(x => x.event === t.event)) g.items.push(t);
  }
  return { vmax, vnow, pain, events: [...days.values()].sort((a, b) => b.d - a.d), undated: ins.timeline.filter(t => !(t.days_ago >= 0)) };
}
function agoLabel(d) {
  let t;
  if (d < 7) t = d === 1 ? 'יום' : d === 2 ? 'יומיים' : d + ' ימים';
  else if (d < 30) { const w = Math.round(d / 7); t = w === 1 ? 'שבוע' : w === 2 ? 'שבועיים' : w + ' שבועות'; }
  else if (d < 365) { const m = Math.round(d / 30); t = m === 1 ? 'חודש' : m === 2 ? 'חודשיים' : m + ' חודשים'; }
  else { const y = Math.round(d / 365 * 2) / 2; t = y === 1 ? 'שנה' : y === 2 ? 'שנתיים' : y + ' שנים'; }
  return 'לפני ' + t;
}
// time runs right to left, as Hebrew reads: the oldest event on the right, today on the left.
// The axis is proportional to time; one event far older than the rest is set apart behind a break.
function timeScale(ds, x0, x1) {
  const uniq = [...new Set(ds)].sort((a, b) => b - a), max = Math.max(1, uniq[0] || 0), next = uniq[1] || 0, span = x1 - x0;
  const steps = [1, 2, 3, 7, 14, 30, 61, 91, 182, 365, 730, 1825, 3650];
  const ticks = (top, f, px) => { const n = Math.max(1, Math.floor(px / 92)), st = steps.find(v => top / v <= n) || steps[steps.length - 1], out = []; for (let d = st; d <= top + 1e-6; d += st) out.push({ d, x: f(d) }); return out; };
  if (!(max > 60 && next >= 1 && max > 4 * next)) { const f = d => x0 + d / max * span; return { x: f, brk: null, ticks: ticks(max, f, span) }; }
  const top = Math.max(7, next * 1.15), olds = uniq.filter(d => d > top), oMin = Math.min(...olds), xm = x0 + 0.74 * span, xo = x0 + 0.86 * span;
  const f = d => d <= top ? x0 + d / top * (xm - x0) : max === oMin ? x1 : xo + (d - oMin) / (max - oMin) * (x1 - xo);
  return { x: f, brk: (xm + xo) / 2, ticks: ticks(top, f, xm - x0) };
}
const PAIN_VAR = { activity: '--pink', unspecified: '--pink', rest: '--bm-par', night: '--indigo' };
// unspecified pain shares activity's colour, so next to it it is drawn as a ring
const ringed = pain => pain.some(p => p.st === 'activity') && pain.some(p => p.st === 'unspecified');
function painMark(st, cx, cy, r, cls = '', ring = false) {
  const c = `class="pmk ${cls}${ring && st === 'unspecified' ? ' ring' : ''}" style="--k:var(${PAIN_VAR[st]})"`;
  if (st === 'rest') return `<rect ${c} x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" rx="1.5"/>`;
  if (st === 'night') return `<path ${c} d="M${cx} ${cy - r * 1.3}L${cx + r * 1.3} ${cy}L${cx} ${cy + r * 1.3}L${cx - r * 1.3} ${cy}Z"/>`;
  return `<circle ${c} cx="${cx}" cy="${cy}" r="${r}"/>`;
}
let measureCtx = null;
function textW(t, px, weight = 400) {
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = `${weight} ${px}px -apple-system, BlinkMacSystemFont, ThalamusSans, system-ui, sans-serif`;
  return measureCtx.measureText(String(t)).width;
}
function wrapLabel(t, maxW, px = 13, maxLines = 2) {
  const words = String(t).split(/\s+/).filter(Boolean), lines = [''];
  for (const w of words) { const cur = lines[lines.length - 1], next = cur ? cur + ' ' + w : w; if (cur && textW(next, px) > maxW) lines.push(w); else lines[lines.length - 1] = next; }
  if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (l && textW(l + '…', px) > maxW) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; }
  return lines;
}
function courseSvg(d, W) {
  const FS = W < 420 ? 13 : 12.5, TICK = W < 420 ? 12.5 : 12, TLF = W < 420 ? 12 : 11, padR = 34, xl = 18, xr = W - padR - 18; // y labels live in the 34px on the right
  const sc = timeScale([...d.events.map(e => e.d), ...d.pain.map(p => p.d)], xl, xr), x = sc.x;
  const band = d.pain.length || d.vmax != null, top = 22, bh = band ? 88 : 0, y0 = top + bh;
  const py = v => y0 - v / 10 * bh, ay = y0 + (band ? 34 : 18), ring = ringed(d.pain);
  let svg = '';
  if (band) {
    const peakY = d.vmax != null && !d.pain.some(p => p.v === d.vmax) ? py(d.vmax) : null;
    // y labels: 0 / 5 / 10, and the peak's own label in the same column; a tick too close to the peak yields
    for (const v of [0, 5, 10]) {
      svg += `<line class="grid" x1="${xl}" y1="${py(v)}" x2="${xr}" y2="${py(v)}"/>`;
      if (peakY == null || Math.abs(py(v) - peakY) > 14) svg += `<text class="tick" x="${W - 4}" y="${py(v) + 4}" text-anchor="start">${v}</text>`;
    }
    if (peakY != null) svg += `<line class="peak" x1="${xl}" y1="${peakY}" x2="${xr}" y2="${peakY}"/><text class="plab" x="${W - 4}" y="${peakY + 4}" text-anchor="start">שיא ${d.vmax}</text>`;
    const labels = [];
    for (const st of PAIN_STATES) {
      const pts = d.pain.filter(p => p.st === st).sort((a, b) => b.d - a.d); if (!pts.length) continue;
      if (pts.length > 1) svg += `<polyline class="pline" style="--k:var(${PAIN_VAR[st]})" points="${pts.map(p => `${x(p.d)},${py(p.v)}`).join(' ')}"/>`;
      const hi = pts.reduce((m, p) => p.v > m.v ? p : m, pts[0]);
      for (const p of pts) {
        svg += painMark(st, x(p.d), py(p.v), 5, p.unv ? 'unv' : '', ring);
        if (p === hi || p.d === 0) labels.push({ x: x(p.d), y: py(p.v), v: p.v });
      }
    }
    // value labels above their mark; when two share a spot, the lower one goes below its mark
    labels.sort((a, b) => a.y - b.y).forEach((l, i, arr) => {
      const clash = arr.slice(0, i).some(o => Math.abs(o.x - l.x) < 18 && Math.abs((o.ly ?? o.y - 10) - (l.y - 10)) < 15);
      l.ly = clash ? l.y + 19 : l.y - 10;
      svg += `<text class="pval" x="${l.x}" y="${l.ly}" text-anchor="middle">${l.v}</text>`;
    });
  }
  svg += `<line class="axis" x1="${xl}" y1="${ay}" x2="${xr + 6}" y2="${ay}"/>`;
  if (sc.brk) svg += `<rect class="brk-bg" x="${sc.brk - 6}" y="${ay - 6}" width="12" height="12"/><path class="brk" d="M${sc.brk - 6} ${ay + 5}l4 -10M${sc.brk + 2} ${ay + 5}l4 -10"/>`;
  // time ticks sit just above the axis, between the pain band and the events
  let lastTx = -1e4;
  for (const t of sc.ticks) {
    const lab = agoLabel(t.d), w = textW(lab, TLF);
    svg += `<line class="tk" x1="${t.x}" y1="${ay - 3}" x2="${t.x}" y2="${ay + 3}"/>`;
    if (t.x - w / 2 > lastTx + 8 && t.x + w / 2 < xr + 10 && t.x - w / 2 > xl + 22) { svg += `<text class="tlab" x="${t.x}" y="${ay - 8}" text-anchor="middle">${lab}</text>`; lastTx = t.x + w / 2; }
  }
  // event labels hang below the axis in rows; a label goes to the first row where it touches nothing
  const rows = [[]], LH = FS + 3, gap = 10, LW = Math.min(132, Math.max(84, W / 4));
  let deepest = ay + 24;
  const evs = d.events.map(e => {
    const lines = []; e.items.slice(0, 2).forEach(t => lines.push(...wrapLabel(t.event, LW, FS, e.items.length > 1 ? 1 : 2)));
    if (e.items.length > 2) lines.push(`ועוד ${e.items.length - 2}`);
    const when = e.when || agoLabel(e.d), w = Math.max(textW(when, FS - 0.5, 600), ...lines.map(l => textW(l, FS))) + 4;
    const cx = x(e.d), lx = Math.min(Math.max(cx, xl + w / 2), W - 4 - w / 2);
    return { e, cx, lx, w, when, lines, unv: e.items.some(t => unvOf(session, t.fields)) };
  });
  const today = { cx: xl, lx: Math.max(xl, textW('היום', FS - 0.5, 600) / 2 + 2), w: textW('היום', FS - 0.5, 600) + 4 };
  rows[0].push([today.lx - today.w / 2, today.lx + today.w / 2]);
  for (const v of evs) {
    const span = [v.lx - v.w / 2, v.lx + v.w / 2];
    let r = rows.findIndex(row => row.every(([a, b]) => span[1] + gap < a || span[0] > b + gap));
    if (r < 0) { rows.push([]); r = rows.length - 1; }
    rows[r].push(span);
    const base = ay + 20 + r * (LH * 3 + 8);
    deepest = Math.max(deepest, base + LH * v.lines.length + 4);
    svg += `<line class="stem" x1="${v.cx}" y1="${ay}" x2="${v.cx}" y2="${base - FS}"/><circle class="ev${v.unv ? ' unv' : ''}" cx="${v.cx}" cy="${ay}" r="5"/>
      <text class="when" x="${v.lx}" y="${base}" text-anchor="middle">${esc(v.when)}</text>${v.lines.map((l, i) => `<text class="lab" x="${v.lx}" y="${base + LH * (i + 1)}" text-anchor="middle">${esc(l)}</text>`).join('')}`;
  }
  svg += `<circle class="ev now" cx="${xl}" cy="${ay}" r="5"/><text class="when" x="${today.lx}" y="${ay + 20}" text-anchor="middle">היום</text>`;
  return `<svg viewBox="0 0 ${W} ${Math.ceil(deepest + 6)}" width="${W}" height="${Math.ceil(deepest + 6)}" aria-hidden="true" style="--fs:${FS}px;--tk:${TICK}px;--tlf:${TLF}px">${svg}</svg>`;
}

/* charts drawn at the width they get, so their text keeps real pixel sizes on a phone too */
const CHARTS = new Map(); let chartSeq = 0;
function chartSlot(cls, draw, label) { const id = 'ch' + (++chartSeq); CHARTS.set(id, draw); return `<div class="${cls}" data-chart="${id}" role="img" aria-label="${esc(label)}"></div>`; }
const chartRO = typeof ResizeObserver === 'function' ? new ResizeObserver(es => es.forEach(e => { const el = e.target; if (Math.abs(el.clientWidth - (+el.dataset.w || 0)) > 6) drawChart(el); })) : null;
function drawChart(el) {
  const draw = CHARTS.get(el.dataset.chart); if (!draw) return;
  chartRO?.observe(el);
  const w = Math.floor(el.clientWidth); if (!w || +el.dataset.w === w) return;
  el.dataset.w = w;
  try { el.innerHTML = draw(w); } catch (e) { el.textContent = ''; console.error(e); }
}
function drawCharts() {
  document.querySelectorAll('[data-chart]').forEach(drawChart);
  if (CHARTS.size > 60) for (const id of [...CHARTS.keys()]) if (!document.querySelector(`[data-chart="${id}"]`)) CHARTS.delete(id);
}
new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.matches?.('[data-chart]') || n.querySelector?.('[data-chart]'))))) drawCharts(); }).observe(document.body, { childList: true, subtree: true });

// the body chart: one continuous silhouette, front and back; marks are painted inside its contour.
// From the front the patient's right is on the viewer's left; from the back it is on the viewer's right.
const BODY_HALF = [[45.5, 24], [45.5, 31], [40, 33.5], [32, 36], [27, 39.5], [24.5, 45], [22.5, 56], [21.5, 68], [20.5, 80], [19, 92], [17.5, 104], [16.5, 114], [15, 120], [14, 127], [15.5, 134], [19, 136], [21.5, 131], [22, 124], [23.5, 114], [25.5, 102], [27, 90], [28.5, 80], [29.5, 68], [31, 58], [33, 52], [33.5, 62], [34.5, 74], [35, 84], [34, 94], [33, 104], [33.5, 118], [35, 134], [37, 150], [37.5, 160], [37, 172], [38.5, 188], [40, 198], [38, 205], [37.5, 210], [44, 211], [46.5, 206], [46.5, 198], [46.5, 186], [46.5, 172], [47, 160], [47.5, 148], [48.5, 132], [49.5, 116], [50, 110]];
const BODY_PATH = (() => {
  const pts = [...BODY_HALF, ...BODY_HALF.slice(0, -1).reverse().map(([x, y]) => [100 - x, y])], n = pts.length, f = v => +v.toFixed(2);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n; i++) { // closed Catmull-Rom spline as cubic Béziers
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d + 'Z';
})();
// where each zone sits on the viewer's left half ([kind, …geometry]); the right half mirrors it
const ZONE_GEO = {
  head: ['e', 50, 13, 10, 12], neck: ['r', 44, 23, 12, 10],
  shoulder: ['e', 31, 40, 9, 8], upper_arm: ['e', 25.5, 62, 7, 15], elbow: ['e', 22.5, 84, 6.5, 6.5], forearm: ['e', 20.5, 103, 6.5, 13], wrist_hand: ['e', 18.5, 126, 7, 11],
  chest: ['r', 33, 35, 17, 27], upper_back: ['r', 33, 35, 17, 30], abdomen: ['r', 33, 62, 17, 30], low_back: ['r', 33, 65, 17, 28], hip: ['r', 32, 92, 18, 22],
  thigh: ['e', 41.5, 130, 9, 20], knee: ['e', 42.5, 154, 6.5, 7], lower_leg: ['e', 42.5, 177, 6, 17], ankle_foot: ['e', 42.5, 203, 7, 9]
};
const FRONT_ONLY = ['chest', 'abdomen'], BACK_ONLY = ['upper_back', 'low_back'], CENTRAL = ['head', 'neck'];
const KIND_RANK = { pain: 3, paresthesia: 2, radiation: 1 };
let bmSeq = 0;
function zoneShape(z, vs, cls) {
  const g = ZONE_GEO[z], m = v => vs === 'R' ? 100 - v : v;
  if (CENTRAL.includes(z)) return g[0] === 'e' ? `<ellipse class="${cls}" cx="${g[1]}" cy="${g[2]}" rx="${g[3]}" ry="${g[4]}"/>` : `<rect class="${cls}" x="${g[1]}" y="${g[2]}" width="${g[3]}" height="${g[4]}"/>`;
  if (g[0] === 'e') return `<ellipse class="${cls}" cx="${m(g[1])}" cy="${g[2]}" rx="${g[3]}" ry="${g[4]}"/>`;
  return `<rect class="${cls}" x="${vs === 'R' ? 100 - g[1] - g[3] : g[1]}" y="${g[2]}" width="${g[3]}" height="${g[4]}"/>`;
}
function bodySvg(items, view) {
  const s = session, paint = {}, id = 'bm' + (++bmSeq);
  for (const b of items) {
    if (!KIND_HE[b.kind] || !BODY_ZONES.includes(b.zone)) continue;
    if ((view === 'front' && BACK_ONLY.includes(b.zone)) || (view === 'back' && FRONT_ONLY.includes(b.zone))) continue;
    if (b.view !== 'both' && b.view !== view && !FRONT_ONLY.includes(b.zone) && !BACK_ONLY.includes(b.zone)) continue;
    const sides = CENTRAL.includes(b.zone) ? ['C'] : b.side === 'right' ? ['P_R'] : b.side === 'left' ? ['P_L'] : ['P_R', 'P_L'];
    for (const ps of sides) {
      const vs = ps === 'C' ? 'C' : view === 'front' ? (ps === 'P_R' ? 'L' : 'R') : (ps === 'P_R' ? 'R' : 'L');
      const k = b.zone + ':' + vs; if (!paint[k] || KIND_RANK[b.kind] > KIND_RANK[paint[k].kind]) paint[k] = b;
    }
  }
  const marks = Object.entries(paint).map(([k, it]) => { const [z, vs] = k.split(':'); return zoneShape(z, vs, 'mk k-' + it.kind + (unvOf(s, it.fields) ? ' unv' : '')); }).join('');
  const lr = view === 'front' ? ['ימין', 'שמאל'] : ['שמאל', 'ימין'];
  return `<svg viewBox="0 0 100 222" aria-hidden="true"><defs><clipPath id="${id}"><path d="${BODY_PATH}"/><ellipse cx="50" cy="13" rx="9.5" ry="11.5"/></clipPath></defs>
    <path class="sil" d="${BODY_PATH}"/><ellipse class="sil" cx="50" cy="13" rx="9.5" ry="11.5"/><g clip-path="url(#${id})">${marks}</g>
    <text class="side" x="17" y="220" text-anchor="middle">${lr[0]}</text><text class="side" x="83" y="220" text-anchor="middle">${lr[1]}</text></svg>`;
}
function bodyCard() {
  const s = session, items = insState(s).body, kinds = [...new Set(items.map(b => b.kind))];
  return `<section class="card">${cardHead('body', atMeta('body'))}
    <div class="bm" role="img" aria-label="מפת גוף: ${esc(items.map(b => `${KIND_HE[b.kind]} ב${ZONE_HE[b.zone]} ${SIDE_HE[b.side] || ''}`).join(', '))}">
      <figure>${bodySvg(items, 'front')}<figcaption>מלפנים</figcaption></figure><figure>${bodySvg(items, 'back')}<figcaption>מאחור</figcaption></figure></div>
    <div class="legend">${kinds.map(k => `<span><i style="--k:var(${KIND_VAR[k]})"></i>${KIND_HE[k]}</span>`).join('')}</div>
    <ul class="zlist">${items.map(b => `<li><i style="--k:var(${KIND_VAR[b.kind]})"></i><span><b>${ZONE_HE[b.zone]}${SIDE_HE[b.side] ? ' ' + SIDE_HE[b.side] : ''}</b> · ${KIND_HE[b.kind]}${b.label ? ': ' + esc(b.label) : ''}${unvOf(s, b.fields) ? UNV : ''}</span></li>`).join('')}</ul></section>`;
}
// which side hurts: from the body map, else from what was said about the location
function involvedSide(s) {
  const c = { right: 0, left: 0 };
  insState(s).body.filter(b => b.kind === 'pain').forEach(b => { if (b.side in c) c[b.side]++; });
  if (c.right !== c.left) return c.right > c.left ? 'right' : 'left';
  const t = (s.fields.location?.value || '') + ' ' + (s.fields.chief_complaint?.value || '');
  const r = /ימין|ימנית/.test(t), l = /שמאל|שמאלית/.test(t);
  return r && !l ? 'right' : l && !r ? 'left' : null;
}
function examCard() {
  const s = session, ex = insState(s).exam, inv = involvedSide(s);
  const col = side => side === 'none' ? 'var(--label-3)' : !inv ? (side === 'right' ? 'var(--orange)' : 'var(--mark-2)') : side === inv ? 'var(--orange)' : 'var(--mark-2)';
  const colS = side => side === 'none' ? 'var(--label-3)' : !inv ? (side === 'right' ? 'var(--green)' : 'var(--mark-2)') : side === inv ? 'var(--green)' : 'var(--mark-2)';
  const SIDES = ['right', 'left', 'none'], sideName = sd => SIDE_HE[sd] || 'צד לא צוין';
  const sideLbl = side => sideName(side) + (inv === side ? ' (צד הפגיעה)' : '');
  const group = rows => { const g = new Map(); rows.forEach(r => { const k = r.motion.trim(); if (!g.has(k)) g.set(k, []); g.get(k).push(r); }); return [...g.entries()]; };
  let rom = '';
  if (ex.rom.length) {
    const groups = group(ex.rom).map(([m, rs]) => [m, rs, romNorm(m, rs.find(r => r.joint)?.joint, s.region)]);
    const max = Math.max(180, ...ex.rom.map(r => r.degrees), ...groups.map(g => g[2]?.deg || 0));
    const pct = v => Math.max(0, Math.min(100, v / max * 100));
    rom = `<div><h3>${ICON.angle} טווחי תנועה (AROM)</h3><div class="bars">${groups.map(([m, rs, nm]) => `<div class="bar-g"><div class="bl"><b>${esc(m)}</b>${rs.some(r => r.painful) ? '<span class="pain">כאב</span>' : ''}${nm ? `<span class="nrm">נורמה <bdi dir="ltr">${nm.deg}°</bdi></span>` : ''}</div>
      ${SIDES.map(sd => rs.filter(x => x.side === sd).slice(0, 1).map(r => `<div class="bar" title="${esc(m)} ${sideName(sd)}: ${r.degrees}°${nm ? ` (נורמה ${nm.deg}°)` : ''}"><span>${SIDE_HE[sd] || '—'}</span><span class="tr"><i style="width:${pct(r.degrees)}%;--k:${col(sd)}${unvOf(s, r.fields) ? ';opacity:.45' : ''}"></i>${nm ? `<b class="nl" style="inset-inline-start:${pct(nm.deg)}%" aria-hidden="true"></b>` : ''}</span><span class="v"><bdi dir="ltr">${r.degrees}°</bdi></span></div>`).join('')).join('')}</div>`).join('')}</div>
      <div class="legend">${SIDES.filter(sd => ex.rom.some(r => r.side === sd)).map(sd => `<span><i style="--k:${col(sd)}"></i>${sideLbl(sd)}</span>`).join('')}${groups.some(g => g[2]) ? `<span><i class="nl-k" aria-hidden="true"></i>טווח תקין (${esc(NORMS.source || 'norms.js')})</span>` : ''}</div></div>`;
  }
  let mmt = '';
  if (ex.mmt.length) {
    const W = 200, x = g => 6 + g / 5 * (W - 12);
    const grade = g => g === 4.5 ? '4+' : g === 3.75 ? '4-' : String(g);
    mmt = `<div><h3>${ICON.dumbbell} כוח (MMT 0–5)</h3><div class="dots">${group(ex.mmt).map(([m, rs]) => `<div class="dot-r"><b>${esc(m)}</b><span class="vals">${SIDES.map(sd => rs.find(r => r.side === sd)).filter(Boolean).map(r => `${SIDE_HE[r.side] ? SIDE_HE[r.side] + ' ' : ''}<bdi dir="ltr">${grade(r.grade)}</bdi>`).join(' · ')}</span>
      <svg viewBox="0 0 ${W} 22" role="img" aria-label="${esc(m)}: ${rs.map(r => (SIDE_HE[r.side] ? SIDE_HE[r.side] + ' ' : '') + grade(r.grade)).join(', ')}"><line class="g" x1="6" y1="9" x2="${W - 6}" y2="9"/>${[0, 1, 2, 3, 4, 5].map(g => `<line class="g" x1="${x(g)}" y1="5" x2="${x(g)}" y2="13"/><text class="tk" x="${x(g)}" y="22" text-anchor="middle">${g}</text>`).join('')}
      ${rs.map(r => `<circle cx="${x(r.grade)}" cy="9" r="5.5" fill="${colS(r.side)}"${unvOf(s, r.fields) ? ' fill-opacity=".5"' : ''}/>`).join('')}</svg></div>`).join('')}</div>
      <div class="legend">${SIDES.filter(sd => ex.mmt.some(r => r.side === sd)).map(sd => `<span><i style="--k:${colS(sd)};border-radius:50%"></i>${sideLbl(sd)}</span>`).join('')}</div></div>`;
  }
  let tests = '';
  if (ex.tests.length) {
    // positive / negative / unclear get a mark; a score or words keep exactly what was said
    const cls = { positive: 'pos', negative: 'neg', equivocal: 'eq', score: 'val', text: 'val' };
    tests = `<div><h3>${ICON.tests} מבדקים מיוחדים</h3><div class="tests">${ex.tests.map(t => `<div class="test"><span class="res ${cls[t.result] || 'val'}">${cls[t.result] === 'val' ? '' : '<i aria-hidden="true"></i>'}${t.result === 'score' && t.value ? `<bdi dir="ltr">${esc(t.value)}</bdi>` : esc(resultText(t))}</span>
      <span class="nm">${t.test_id && testLink(t.test_id) ? `<a href="${testLink(t.test_id)}" target="${MAP_TARGET}">${esc(t.name)}</a>` : `<b>${esc(t.name)}</b>`}${unvOf(s, t.fields) ? UNV : ''}</span><span class="sd">${SIDE_HE[t.side] || ''}</span></div>`).join('')}</div></div>`;
  }
  return `<section class="card span2">${cardHead('exam', atMeta('exam'))}<div class="exam">${rom}${mmt}${tests}</div></section>`;
}
function hypoCard(inGrid) {
  const s = session, list = insState(s).hypo, lvl = '<span class="lv" aria-hidden="true"><i></i><i></i><i></i></span>';
  return `<section class="card${inGrid ? ' span2' : ''}">${cardHead('hypo', atMeta('hypo') + hypoBtn('עדכן'))}
    <div class="hyps">${list.map(h => `<div class="hyp"><h3>${esc(h.name)}</h3><span class="st ${STATUS_HE[h.status] ? h.status : 'possible'}">${lvl}${STATUS_HE[h.status] || STATUS_HE.possible}</span>
      ${h.support?.length || h.against?.length ? `<div class="ev"><div><b>תומך</b>${h.support?.length ? `<ul>${h.support.map(x => `<li>${escN(x)}</li>`).join('')}</ul>` : '<span class="muted">—</span>'}</div><div><b>סותר</b>${h.against?.length ? `<ul>${h.against.map(x => `<li>${escN(x)}</li>`).join('')}</ul>` : '<span class="muted">—</span>'}</div></div>` : ''}
      ${h.tests?.length ? `<div class="ts">מבדקים שיעזרו להבחין: ${h.tests.map(id => testLink(id) ? `<a class="chipl" href="${testLink(id)}" target="${MAP_TARGET}">${esc(testName(id))}</a>` : `<span class="chipl">${esc(testName(id))}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>
    <p class="fine">השערות עבודה לחשיבה קלינית, לא אבחנה. ${MAP_TAB[s.region] ? 'נשענות על המסלולים במפת הדרך לאזור.' : 'לאזור הזה עוד אין מסלולים במפה.'}</p></section>`;
}

/* ---------------- speech recognition ---------------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recording = false, recSince = 0, interim = '', committedW = [], firstAdd = true, recSid = 0, wakeLock = null;
let uttStart = 0; // when the words now being recognized began — the line's position in the saved recording
const rawLog = []; // last recognition events, for diagnosing browser-specific duplicates
/* word-level merging — tested against desktop, Android-cumulative, resend, overlap and revision patterns */
const normW = w => w.replace(/[.,!?;:״"׳'()\[\]\-–—…]/g, '').toLowerCase();
const toWords = s => String(s || '').trim().split(/\s+/).filter(Boolean);
function prefixLen(P, N) { let i = 0; while (i < P.length && i < N.length && P[i] === N[i]) i++; return i; }
function newWords(prev, next, { revision = true, minContained = 1 } = {}) {
  const P = prev.map(normW), N = next.map(normW);
  if (!N.length) return [];
  const i = prefixLen(P, N);
  if (i === P.length) return next.slice(i);
  if (revision && i >= Math.max(2, Math.ceil(P.length * 0.5))) return next.slice(P.length);
  if (N.length >= minContained && (' ' + P.join(' ') + ' ').includes(' ' + N.join(' ') + ' ')) return [];
  for (let k = Math.min(P.length, N.length); k >= 2; k--) {
    if (P.slice(-k).join(' ') === N.slice(0, k).join(' ')) return next.slice(k);
  }
  return next;
}
// replaces when `next` extends or revises `acc`, otherwise appends only the new words
function absorb(acc, next) {
  const add = newWords(acc, next);
  const i = prefixLen(acc.map(normW), next.map(normW));
  if (i === acc.length || i >= Math.max(2, Math.ceil(acc.length * 0.5))) return { acc: next.length >= acc.length ? next : acc, add };
  return { acc: acc.concat(add), add };
}
function transcriptTail(n = 60) {
  if (!session) return [];
  const out = [];
  for (let i = session.segments.length - 1; i >= 0 && out.length < n; i--) out.unshift(...toWords(session.segments[i].text));
  return out.slice(-n);
}
const IS_LOCAL_FILE = !window.isSecureContext || /^(file|content):/.test(location.protocol);
const IS_SAMSUNG = /SamsungBrowser/i.test(navigator.userAgent);
function envProblem() {
  if (IS_LOCAL_FILE) return 'האפליקציה פתוחה כקובץ מהטלפון, לא מכתובת https. במצב כזה הדפדפן חוסם את המיקרופון ואת ההתחברות ל-Google. העלה את התיקייה לאחסון (שלב 2 בהוראות) ופתח את הכתובת ב-Chrome.';
  if (IS_SAMSUNG) return 'זה דפדפן Samsung Internet. זיהוי הדיבור נבדק רק ב-Chrome — פתח את אותה כתובת ב-Chrome.';
  return '';
}
const useSoniox = () => settings.engine === 'soniox';
async function startRec() {
  if (IS_LOCAL_FILE) { toast(envProblem(), true, 9000); return; }
  if (!session.consent) { toast('חסר אישור הסכמת המטופל להקלטה', true); return; }
  if (PL.audio) PL.audio.pause(); // a playing line would be picked up by the microphone
  if (useSoniox()) {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { toast('הדפדפן הזה לא תומך בהקלטה', true); return; }
    recording = true; recSince = Date.now(); grabWakeLock(); renderRecState();
    try { await sonioxStart(); }
    catch (e) { recording = false; recSince = 0; closeMic(); releaseWakeLock(); renderRecState(); toast(micErrText(e), true, 8000); }
    return;
  }
  if (!SR) { toast('הדפדפן הזה לא תומך בזיהוי דיבור. פתח ב-Chrome, או בחר בהגדרות את מנוע Soniox, או הקלד/הדבק טקסט בלשונית "תמלול".', true, 7000); return; }
  recording = true; recSince = Date.now();
  spawnRec(); grabWakeLock(); renderRecState();
  // the recording is saved alongside the browser's recognizer; some phones give the microphone to only one of them
  if (settings.saveAudio && !noAudioWithSR()) openMic().then(st => { if (recording) startSaver(st); else closeMic(); })
    .catch(e => toast('ההקלטה לא נשמרת: ' + micErrText(e), true, 6000));
}
function stopRec() {
  recording = false;
  if (session && recSince) { session.recordedMs = (session.recordedMs || 0) + (Date.now() - recSince); recSince = 0; saveSession(); }
  if (useSoniox()) sonioxStop(); else { try { rec && rec.stop(); } catch { } }
  stopSaver(); setTimeout(() => { if (!recording) closeMic(); }, 4500);
  releaseWakeLock(); renderRecState();
  setTimeout(() => { maybeFill(true); renderAudioBox(); }, useSoniox() ? 4800 : 900);
}
function micErrText(e) {
  if (e?.name === 'NotAllowedError') return 'האתר חסום למיקרופון. סמל המנעול ליד הכתובת ← הרשאות ← מיקרופון ← אפשר.';
  if (e?.name === 'NotFoundError') return 'לא נמצא מיקרופון במכשיר';
  if (e?.name === 'NotReadableError') return 'המיקרופון תפוס על ידי אפליקציה אחרת';
  return e?.message || String(e);
}
const noAudioWithSR = () => { try { return localStorage.getItem('ca.noAudioWithSR') === '1'; } catch { return false; } };
// Edge (and sometimes Chrome) can keep a recognizer open that no longer returns anything; restart it when it goes quiet
const IS_ANDROID = /Android/i.test(navigator.userAgent);
let lastRecEvent = 0;
const WATCHDOG_MS = 12000;
function restartRec(reason) {
  if (!recording || useSoniox()) return;
  rawLog.push({ t: Date.now(), sid: recSid, restart: reason });
  lastRecEvent = Date.now();
  try { rec && rec.abort(); } catch { }
}
function spawnRec() {
  lastRecEvent = Date.now();
  rec = new SR();
  rec.lang = settings.lang || 'he-IL';
  rec.interimResults = true;
  rec.continuous = !!settings.continuous;
  rec.maxAlternatives = 1;
  committedW = []; firstAdd = true; recSid++; uttStart = 0;
  rec.onresult = onRecResult;
  rec.onerror = e => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      recording = false; renderRecState();
      toast(envProblem() || (e.error === 'service-not-allowed'
        ? 'שירות זיהוי הדיבור לא זמין בדפדפן הזה. פתח ב-Chrome ובדוק שאפליקציית Google מותקנת ומעודכנת.'
        : 'האתר חסום למיקרופון. ב-Chrome: סמל המנעול ליד הכתובת ← הרשאות ← מיקרופון ← אפשר.'), true, 9000);
      return;
    }
    if (e.error === 'network') { toast('אין חיבור לשירות זיהוי הדיבור — בדוק אינטרנט', true); return; }
    if (e.error === 'audio-capture') {
      if (saver) { // this device can't share the microphone between recognition and recording — keep recognition
        stopSaver(); closeMic();
        try { localStorage.setItem('ca.noAudioWithSR', '1'); } catch { }
        toast('במכשיר הזה הדפדפן לא מאפשר לזהות דיבור ולהקליט יחד. הזיהוי ממשיך בלי שמירת הקלטה. לשמירת הקלטה בחר בהגדרות את מנוע Soniox.', true, 9000);
        return;
      }
      recording = false; renderRecState(); toast('המיקרופון תפוס או לא זמין', true); return;
    }
    toast('שגיאת זיהוי: ' + e.error, true);
  };
  rec.onstart = () => { lastRecEvent = Date.now(); };
  rec.onspeechstart = () => { lastRecEvent = Date.now(); if (!uttStart) uttStart = Date.now(); };
  rec.onend = () => {
    interim = ''; renderInterim();
    if (recording) setTimeout(() => { if (recording) { try { spawnRec(); } catch { } } }, 250);
  };
  try { rec.start(); } catch { }
}
// Browsers deliver results differently (separate finals, Android's cumulative repeats, re-sends after a restart);
// everything is reduced to "which words are actually new" before it reaches the transcript.
function onRecResult(e) {
  lastRecEvent = Date.now();
  if (!uttStart) uttStart = Date.now() - 700; // the first result comes a little after the speech began
  const finals = []; let inter = '';
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    if (r.isFinal) finals.push(r[0].transcript.trim()); else inter += r[0].transcript;
  }
  let added = '';
  if (finals.length) {
    let cand = [];
    for (const f of finals) if (f) cand = absorb(cand, toWords(f)).acc;
    const step = absorb(committedW, cand);
    committedW = step.acc;
    let add = step.add;
    // a restarted recognizer often re-sends what was already written — check against the transcript tail
    if (add.length && (firstAdd || add.length >= 4)) add = newWords(transcriptTail(), add, { revision: false, minContained: firstAdd ? 1 : 4 });
    if (add.length) { firstAdd = false; added = add.join(' '); addSegment(added, false, { t0: uttStart }); }
  }
  // continuous sessions repeat every earlier final in each event, so only newly written words close an utterance
  if (added) uttStart = inter.trim() ? Date.now() - 700 : 0;
  else if (!inter.trim()) uttStart = 0;
  rawLog.push({ t: Date.now(), sid: recSid, finals, interim: inter, added });
  if (rawLog.length > 400) rawLog.shift();
  interim = inter.trim(); renderInterim();
  // an empty final is how Edge says "heard nothing" — it tends to hang right after, so start a fresh session
  if (finals.length && !finals[finals.length - 1] && !inter.trim()) setTimeout(() => restartRec('empty-final'), 150);
}
function addSegment(text, manual = false, extra = {}) {
  if (!session || !text.trim()) return;
  const g = { t: Date.now(), stage: session.stage, text: text.trim() };
  if (manual) g.manual = true;
  if (extra.speaker != null) g.speaker = extra.speaker;
  if (extra.t0 > 0) g.t0 = Math.round(Math.min(extra.t0, g.t));
  session.segments.push(g);
  touch();
  appendSegmentUI(g, session.segments.length - 1);
  refreshTabLabels();
  maybeFill();
}
async function grabWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch { } wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && recording) { grabWakeLock(); if (!useSoniox()) { try { rec && rec.start(); } catch { } } }
});
window.addEventListener('beforeunload', e => { if (recording) { e.preventDefault(); e.returnValue = ''; } });

/* ---------------- audio recording ----------------
   The session audio is kept on the device (IndexedDB, in 5-second pieces so a crash loses little)
   and uploaded to the patient's Drive folder with the session. Each start/stop of the recording is one part. */
const AUDIO_DB = 'ca-audio';
let mic = null, saver = null;
function audioDb() {
  return audioDb.p ||= new Promise((res, rej) => {
    const r = indexedDB.open(AUDIO_DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('chunks', { autoIncrement: true }).createIndex('sid', 'sid');
    r.onsuccess = () => res(r.result);
    r.onerror = () => { audioDb.p = null; rej(r.error); };
  });
}
async function audioPut(row) {
  if (settings.encrypt && VAULT.key) { const { iv, data } = await sealBlob(row.blob); row = { ...row, blob: null, enc: 1, iv, data }; }
  const db = await audioDb();
  return new Promise((res, rej) => { const tx = db.transaction('chunks', 'readwrite'); tx.objectStore('chunks').add(row); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function audioParts(sid) {
  const db = await audioDb();
  const rows = await new Promise((res, rej) => { const q = db.transaction('chunks').objectStore('chunks').index('sid').getAll(sid); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  const parts = new Map();
  for (const r of rows) {
    if (!parts.has(r.part)) parts.set(r.part, { part: r.part, mime: r.mime, blobs: [], start: r.t, end: r.t });
    const p = parts.get(r.part); p.end = r.t;
    if (r.enc) { if (!VAULT.key) throw new Error('ההקלטה מוצפנת: צריך להתחבר ל-Google'); p.blobs.push(new Blob([await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, VAULT.key, r.data)])); }
    else p.blobs.push(r.blob);
  }
  return [...parts.values()].sort((a, b) => a.part - b.part).map(p => ({ part: p.part, mime: p.mime, start: p.start, end: p.end, blob: new Blob(p.blobs, { type: p.mime }), ms: p.end - p.start + 5000 }));
}
// turning encryption on or off rewrites the stored chunks in the new form
async function resealAudio(on) {
  try {
    const db = await audioDb();
    const rows = await new Promise((res, rej) => { const out = []; const c = db.transaction('chunks').objectStore('chunks').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.primaryKey, cur.value]); cur.continue(); } else res(out); }; c.onerror = () => rej(c.error); });
    for (const [k, r] of rows) {
      let next = null;
      if (on && !r.enc) { const { iv, data } = await sealBlob(r.blob); next = { ...r, blob: null, enc: 1, iv, data }; }
      else if (!on && r.enc) next = { ...r, enc: 0, iv: null, data: null, blob: new Blob([await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv }, VAULT.key, r.data)], { type: r.mime }) };
      if (next) await new Promise((res, rej) => { const tx = db.transaction('chunks', 'readwrite'); tx.objectStore('chunks').put(next, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
  } catch (e) { console.warn('reseal audio', e); }
}
async function audioDelete(sid) {
  try {
    const db = await audioDb();
    await new Promise(res => {
      const tx = db.transaction('chunks', 'readwrite'), st = tx.objectStore('chunks');
      const c = st.index('sid').openKeyCursor(IDBKeyRange.only(sid));
      c.onsuccess = () => { const cur = c.result; if (cur) { st.delete(cur.primaryKey); cur.continue(); } };
      tx.oncomplete = res; tx.onerror = res;
    });
  } catch { }
}
const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
async function openMic() {
  if (mic && mic.active) return mic;
  mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  return mic;
}
function closeMic() { try { mic && mic.getTracks().forEach(t => t.stop()); } catch { } mic = null; }
function newRecorder(stream) {
  const mime = pickMime();
  return new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : {});
}
function startSaver(stream) {
  if (!window.MediaRecorder || !session || saver) return;
  const s = session, sid = s.id;
  s.audioParts = (s.audioParts || 0) + 1; const part = s.audioParts;
  const r = newRecorder(stream);
  s.audioStarts = { ...(s.audioStarts || {}), [part]: Date.now() }; // where each transcript line sits in the recording
  saveSession(true);
  r.ondataavailable = e => { if (e.data && e.data.size) audioPut({ sid, part, t: Date.now(), mime: r.mimeType || 'audio/webm', blob: e.data }).catch(err => console.warn('audio', err)); };
  r.start(5000); saver = r; r._sid = sid; r._part = part;
}
function stopSaver() {
  if (saver && session && saver._sid === session.id) { session.audioEnds = { ...(session.audioEnds || {}), [saver._part]: Date.now() }; saveSession(true); }
  try { saver && saver.state !== 'inactive' && saver.stop(); } catch { }
  saver = null;
}
const fmtBytes = n => n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1e3)) + 'KB';
let audioUrls = [];
async function renderAudioBox() {
  const box = $('#audioBox'); if (!box || !session) return;
  audioUrls.forEach(u => URL.revokeObjectURL(u)); audioUrls = [];
  let parts = []; try { parts = await audioParts(session.id); } catch { }
  if (!parts.length) { box.innerHTML = settings.saveAudio ? '' : '<p class="muted small">שמירת ההקלטה כבויה בהגדרות.</p>'; return; }
  box.innerHTML = `<div class="audio-box"><div class="lbl" style="margin-top:0">הקלטות המפגש: נשמרות במכשיר עד סגירת המפגש, ועולות ל-Drive עם "שמור ל-Drive"</div>` +
    parts.map(p => {
      const url = URL.createObjectURL(p.blob); audioUrls.push(url);
      const ext = /mp4/.test(p.mime) ? 'm4a' : /ogg/.test(p.mime) ? 'ogg' : 'webm';
      const up = session.audioIds?.[p.part]?.size === p.blob.size ? ' · שמור ב-Drive' : '';
      return `<div class="audio-part"><b>חלק ${p.part}</b><span class="muted small">${fmtClock(p.ms)} · ${fmtBytes(p.blob.size)}${up}</span>
        <a class="btn sm" href="${url}" download="הקלטה ${fmtStamp(session.startedAt).replace(':', '-')} חלק ${p.part}.${ext}">הורד</a>
        <audio controls preload="metadata" src="${url}"></audio></div>`;
    }).join('') + '</div>';
  $$('#audioBox audio').forEach(a => a.addEventListener('loadedmetadata', () => ensureSeekable(a), { once: true }));
}

/* ---------------- listening back to a transcript line ----------------
   Every line keeps the moment it began (t0) and every recording part the moment it started (audioStarts),
   so ▶ next to a line plays the saved recording from just before it — to check a doubtful word or number. */
const PLAY_LEAD = 1.5; // seconds of audio played before the line itself
const PL = { audio: null, url: '', sid: '', part: 0, size: 0, start: 0, seg: -1 };
const lineStart = g => g.t0 || g.t - 5000;
const partStartOf = (s, p) => s.audioStarts?.[p.part] ?? (p.start - 5000);
// a MediaRecorder file carries no duration, and browsers can't seek in it until they've read it to the end once
function ensureSeekable(a) {
  return new Promise(res => {
    let finished = false;
    const done = () => { if (finished) return; finished = true; clearTimeout(tm); a.removeEventListener('durationchange', onDur); a.removeEventListener('error', done); res(); };
    const onDur = () => { if (isFinite(a.duration)) { a.currentTime = 0; done(); } };
    const tm = setTimeout(done, 5000);
    a.addEventListener('error', done);
    const ready = () => {
      if (isFinite(a.duration)) return done();
      a.addEventListener('durationchange', onDur);
      a.currentTime = 1e101;
    };
    if (a.readyState >= 1) ready(); else a.addEventListener('loadedmetadata', ready, { once: true });
  });
}
function recPos(s, g) { // where a line sits in the saved recording, for the transcript document
  if (g.manual || !s.audioStarts) return '';
  const t0 = lineStart(g);
  const hit = Object.entries(s.audioStarts).map(([k, v]) => [+k, v]).sort((a, b) => a[0] - b[0]).filter(([, st]) => st <= t0 + 2000).pop();
  if (!hit) return '';
  const end = s.audioEnds?.[hit[0]]; if (end && t0 > end + 3000) return '';
  return (Object.keys(s.audioStarts).length > 1 ? `חלק ${hit[0]} ` : '') + fmtClock(Math.max(0, t0 - hit[1]));
}
async function playerFor(s, p) {
  if (PL.audio && PL.sid === s.id && PL.part === p.part && PL.size === p.blob.size) return PL.audio;
  stopPlayer(false);
  const a = new Audio(); a.preload = 'auto';
  PL.url = URL.createObjectURL(p.blob); a.src = PL.url;
  Object.assign(PL, { audio: a, sid: s.id, part: p.part, size: p.blob.size, start: partStartOf(s, p) });
  a.addEventListener('timeupdate', onPlayerTime);
  for (const ev of ['play', 'pause', 'ended']) a.addEventListener(ev, renderPlayer);
  return a;
}
async function playSeg(i) {
  const s = session, g = s?.segments[i]; if (!g) return;
  if (recording) { toast('ההשמעה זמינה כשההקלטה עצורה — אחרת המיקרופון יקלוט אותה שוב לתמלול', true, 5000); return; }
  let parts = []; try { parts = await audioParts(s.id); } catch { }
  const t0 = lineStart(g);
  const p = parts.filter(p => partStartOf(s, p) <= t0 + 2000).pop();
  if (!p || t0 > p.end + 5000) { toast('אין הקלטה לקטע זה', true); return; }
  const a = await playerFor(s, p);
  await ensureSeekable(a);
  a.currentTime = Math.max(0, (t0 - PL.start) / 1000 - PLAY_LEAD);
  PL.seg = i; markPlaying(false);
  try { await a.play(); } catch (e) { toast('לא ניתן להשמיע את ההקלטה: ' + (e.message || e), true); }
  renderPlayer();
}
function onPlayerTime() {
  const a = PL.audio; if (!a || !session) return;
  const abs = PL.start + (a.currentTime + PLAY_LEAD) * 1000;
  let cur = -1;
  session.segments.forEach((g, i) => { if (!g.manual && lineStart(g) <= abs && lineStart(g) >= PL.start - 3000) cur = i; });
  if (cur >= 0 && cur !== PL.seg) { PL.seg = cur; markPlaying(true); }
  renderPlayerTime();
}
function markPlaying(scroll) {
  $$('.seg.playing').forEach(el => el.classList.remove('playing'));
  if (!PL.audio || PL.seg < 0) return;
  $$(`.seg[data-i="${PL.seg}"]`).forEach(el => { el.classList.add('playing'); if (scroll) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
}
function stopPlayer(hide = true) {
  if (PL.audio) { try { PL.audio.pause(); } catch { } PL.audio.removeAttribute('src'); PL.audio = null; }
  if (PL.url) URL.revokeObjectURL(PL.url);
  Object.assign(PL, { url: '', sid: '', part: 0, size: 0, seg: -1 });
  if (hide) { markPlaying(false); renderPlayer(); }
}
function renderPlayer() {
  let el = $('#player');
  document.body.classList.toggle('has-player', !!PL.audio);
  if (!PL.audio) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'player'; el.className = 'player';
    el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'השמעת ההקלטה');
    document.body.appendChild(el);
  }
  el.hidden = false;
  const paused = PL.audio.paused;
  el.innerHTML = `<button class="main" data-act="plToggle" aria-label="${paused ? 'המשך השמעה' : 'השהה'}">${paused ? ICON.play : ICON.pause}</button>
    <button data-act="plSeek" data-d="-5" aria-label="5 שניות אחורה"><span dir="ltr">−5</span></button>
    <button data-act="plSeek" data-d="5" aria-label="5 שניות קדימה"><span dir="ltr">+5</span></button>
    <span class="pl-t" id="plTime"></span>
    <button data-act="plClose" aria-label="סגור את הנגן">${ICON.close}</button>`;
  renderPlayerTime();
}
function renderPlayerTime() {
  const t = $('#plTime'); if (!t || !PL.audio) return;
  const a = PL.audio, dur = isFinite(a.duration) ? ' / ' + fmtClock(a.duration * 1000) : '';
  const g = session?.segments[PL.seg];
  t.innerHTML = `<span dir="ltr">${fmtClock(a.currentTime * 1000)}${dur}</span>${g?.speaker != null ? ` · דובר ${esc(g.speaker)}` : ''}${(session?.audioParts || 0) > 1 ? ` · חלק ${PL.part}` : ''}`;
}

/* ---------------- Soniox: continuous cloud transcription ----------------
   The microphone streams to Soniox over a WebSocket; final tokens become transcript segments at each
   detected end of utterance or change of speaker. The browser gets a short-lived key from the site's own
   function (/api/soniox-key on Cloudflare), so the account key never reaches the device. */
const STT = { ws: null, feeder: null, buf: '', spk: null, t0: 0, connAt: 0, lastFinal: 0, retries: 0, noContext: false, stopping: false };
function clinicalTerms() {
  const base = ['MMT', 'AROM', 'PROM', 'ROM', 'VAS', 'End Feel', 'Empty Can', 'Full Can', 'Neer', 'Hawkins-Kennedy', 'Painful Arc', 'Drop Arm', "Speed's Test", 'Yergason', "O'Brien", 'Apprehension', 'Relocation', 'Spurling', 'ULTT', 'Lachman', 'McMurray', 'Thessaly', 'FABER', 'FADIR', 'SLR', 'Phalen', 'Tinel', 'Finkelstein', 'PSFS', 'QuickDASH', 'SAPS', 'ACL', 'PCL', 'MCL', 'LCL', 'מבדק', 'מבדקים', 'אנמנזה', 'דגלים אדומים', 'דגלים צהובים'];
  return [...new Set([...base, ...siteTestNames.map(n => n.split(/ — |\(|&/)[0].trim())])].filter(Boolean).slice(0, 150);
}
async function sonioxKey() {
  let r;
  try {
    r = await fetch(new URL('../api/soniox-key', location.href).href, { method: 'POST', headers: { 'content-type': 'application/json', 'x-access-code': settings.accessCode || '' }, body: '{}' });
  } catch { throw new Error('אין חיבור לשרת של האתר'); }
  if (r.status === 404 || r.status === 405) throw new Error('מנוע Soniox עובד רק מהכתובת של האתר ב-Cloudflare');
  if (r.status === 401) throw new Error('קוד הגישה לתמלול שגוי — בדוק בהגדרות');
  let j = {}; try { j = await r.json(); } catch { }
  if (!r.ok || !(j.api_key || j.key)) throw new Error('לא התקבל מפתח זמני ל-Soniox' + (j.error ? ': ' + j.error : ` (${r.status})`));
  return j.api_key || j.key;
}
function sttFlush() {
  const t = STT.buf.replace(/\s+/g, ' ').trim(); STT.buf = '';
  const t0 = STT.t0; STT.t0 = 0;
  if (t) addSegment(t, false, { speaker: STT.spk, t0 });
}
function sttFail(msg) {
  STT.stopping = true;
  if (recording) stopRec();
  toast(msg, true, 9000);
}
async function sonioxStart() {
  STT.stopping = false; STT.retries = 0; STT.buf = ''; STT.spk = null;
  loadTestNames();
  const stream = await openMic();
  if (settings.saveAudio) startSaver(stream);
  await sonioxConnect(stream, true);
}
async function sonioxConnect(stream, first = false) {
  let key;
  try { key = await sonioxKey(); }
  catch (e) { if (first) throw e; sttFail(e.message); return; }
  if (!recording || STT.stopping) return;
  const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket', ['soniox-api-key', key]);
  STT.ws = ws;
  ws.onopen = () => {
    const cfg = { model: 'stt-rt-v5', audio_format: 'auto', language_hints: ['he', 'en'], enable_speaker_diarization: true, enable_endpoint_detection: true };
    if (!STT.noContext) cfg.context = {
      general: [{ key: 'domain', value: 'Sports therapy clinical session: anamnesis and physical examination' }, { key: 'language', value: 'Hebrew with English clinical test names' }],
      terms: clinicalTerms()
    };
    ws.send(JSON.stringify(cfg));
    // a fresh recorder for every connection — each stream has to start with its own container header
    const fr = newRecorder(stream);
    fr.ondataavailable = e => { if (e.data && e.data.size && ws.readyState === 1) ws.send(e.data); };
    fr.start(250); STT.feeder = fr; STT.connAt = Date.now(); // token times (start_ms) count from here
    rawLog.push({ t: Date.now(), soniox: 'open' });
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.error_code) {
      rawLog.push({ t: Date.now(), soniox: 'error', code: m.error_code, type: m.error_type, msg: m.error_message });
      if (m.error_code === 400 && !STT.noContext) { STT.noContext = true; return; } // reconnects without the vocabulary
      if ([400, 401, 402, 403].includes(m.error_code)) sttFail(m.error_code === 402 ? 'אין יתרה בחשבון Soniox' : `Soniox: ${m.error_message || m.error_code}`);
      return;
    }
    let inter = '';
    for (const tk of m.tokens || []) {
      const tx = tk.text || '';
      if (tx === '<end>' || tx === '<fin>') { if (tk.is_final) sttFlush(); continue; }
      if (tk.is_final) {
        if (tk.speaker != null && STT.spk != null && String(tk.speaker) !== String(STT.spk) && STT.buf.trim()) sttFlush();
        if (tk.speaker != null) STT.spk = tk.speaker;
        if (!STT.buf.trim() && tx.trim()) STT.t0 = tk.start_ms != null ? STT.connAt + tk.start_ms : Date.now() - 1500;
        STT.buf += tx; STT.lastFinal = Date.now();
      } else inter += tx;
    }
    if ((m.tokens || []).length) rawLog.push({ t: Date.now(), soniox: 'tokens', n: m.tokens.length, buf: STT.buf.slice(-60), interim: inter.slice(-60) });
    if (rawLog.length > 400) rawLog.shift();
    interim = (STT.buf + inter).replace(/\s+/g, ' ').trim(); renderInterim();
    if (m.finished) sttFlush();
  };
  ws.onclose = ev => {
    try { STT.feeder && STT.feeder.state !== 'inactive' && STT.feeder.stop(); } catch { }
    STT.feeder = null; sttFlush(); interim = ''; renderInterim();
    if (recording && !STT.stopping && useSoniox() && STT.ws === ws) {
      const wait = Math.min(15000, 1000 * 2 ** STT.retries++);
      rawLog.push({ t: Date.now(), soniox: 'closed', code: ev.code, retryMs: wait });
      setFillStatus(`החיבור לתמלול נקטע — מתחבר מחדש… (ההקלטה ממשיכה להישמר)`, true);
      setTimeout(() => { if (recording && !STT.stopping) sonioxConnect(mic || stream); }, wait);
    }
  };
}
function sonioxStop() {
  STT.stopping = true;
  const ws = STT.ws;
  try { STT.feeder && STT.feeder.state !== 'inactive' && STT.feeder.stop(); } catch { }
  // let the last piece of audio go out, then tell Soniox the audio ended; it answers with the remaining final words
  setTimeout(() => { try { ws && ws.readyState === 1 && ws.send(''); } catch { } }, 400);
  setTimeout(() => { try { ws && ws.readyState < 2 && ws.close(); } catch { } sttFlush(); }, 4000);
}

/* ---------------- Google Drive ---------------- */
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.appdata';
let gToken = null, gExp = 0;
try { const t = JSON.parse(sessionStorage.getItem('ca.gtoken') || 'null'); if (t && t.exp > Date.now() && t.scope === SCOPES) { gToken = t.token; gExp = t.exp; } } catch { }
function getToken(interactive = true) {
  return new Promise((resolve, reject) => {
    if (gToken && Date.now() < gExp - 60000) return resolve(gToken);
    if (!settings.clientId) return reject(new Error('חסר Google Client ID בהגדרות'));
    if (!window.google?.accounts?.oauth2) return reject(new Error('ספריית ההתחברות של Google לא נטענה — בדוק אינטרנט ורענן'));
    if (!interactive) return reject(new Error('נדרשת התחברות ל-Google'));
    const client = google.accounts.oauth2.initTokenClient({
      client_id: settings.clientId, scope: SCOPES,
      callback: r => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        gToken = r.access_token; gExp = Date.now() + (r.expires_in || 3600) * 1000;
        try { sessionStorage.setItem('ca.gtoken', JSON.stringify({ token: gToken, exp: gExp, scope: SCOPES })); } catch { }
        resolve(gToken);
      },
      error_callback: e => reject(new Error(e?.type === 'popup_closed' ? 'חלון ההתחברות נסגר' : (e?.message || 'ההתחברות ל-Google נכשלה')))
    });
    client.requestAccessToken({ prompt: '' });
  });
}
async function gfetch(url, opts = {}) {
  const token = await getToken();
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + token } });
  if (r.status === 401) { gToken = null; try { sessionStorage.removeItem('ca.gtoken'); } catch { } }
  if (!r.ok) {
    let msg = r.statusText; try { const j = await r.json(); msg = j.error?.message || msg; } catch { }
    const err = new Error(`Drive ${r.status}: ${msg}`); err.status = r.status; throw err;
  }
  return r;
}
const DAPI = 'https://www.googleapis.com/drive/v3/files';
const qEsc = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function driveFind(q) {
  const r = await gfetch(`${DAPI}?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=10`);
  return (await r.json()).files || [];
}
async function driveFolder(name, parent, tag) {
  const meta = { name, mimeType: 'application/vnd.google-apps.folder', appProperties: { ca: tag } };
  if (parent) meta.parents = [parent];
  const r = await gfetch(DAPI + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta) });
  return (await r.json()).id;
}
async function folderAlive(id) {
  try { const r = await gfetch(`${DAPI}/${id}?fields=id,trashed`); const j = await r.json(); return !j.trashed; } catch { return false; }
}
async function ensureRoot() {
  if (settings.rootFolderId && await folderAlive(settings.rootFolderId)) return settings.rootFolderId;
  const found = await driveFind(`mimeType='application/vnd.google-apps.folder' and appProperties has { key='ca' and value='root' } and trashed=false`);
  const id = found[0]?.id || await driveFolder(settings.rootFolderName || 'מטופלים', null, 'root');
  settings.rootFolderId = id; saveSettings();
  return id;
}
async function ensurePatientFolder(root, name) {
  const p = patients.find(x => x.name === name);
  if (p?.folderId && await folderAlive(p.folderId)) return p.folderId;
  const found = await driveFind(`name='${qEsc(name)}' and '${root}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const id = found[0]?.id || await driveFolder(name, root, 'patient');
  upsertPatient({ name, folderId: id });
  return id;
}
async function upsertDoc(id, name, html, parent) {
  const boundary = 'ca' + Math.random().toString(36).slice(2);
  const meta = id ? { name } : { name, mimeType: 'application/vnd.google-apps.document', parents: [parent] };
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${html}\r\n--${boundary}--`;
  const url = id ? `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=multipart&fields=id` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`;
  try {
    const r = await gfetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    return (await r.json()).id;
  } catch (e) {
    if (id && (e.status === 404 || e.status === 403)) return upsertDoc(null, name, html, parent);
    throw e;
  }
}
/* ---------------- knowledge base ----------------
   Two sources, both read at analysis time:
   1. the athletic-therapy-map site (public GitHub repo) → per-region decision map (kb-site.js)
   2. lesson summaries in the therapist's own Drive (Google Docs, docx, PDF, text) — private, read with drive.readonly
   Texts are cached in Cache Storage (not localStorage, which is small and holds the sessions). */
/* ---------------- encryption at rest, opened by the therapist's Google account ----------------
   A random AES-GCM key lives in the hidden app folder of the therapist's own Google Drive (appDataFolder).
   With encryption on, the open session, the patient list and the recordings are stored sealed with it.
   The key is fetched after Google sign-in and kept only in memory, so a device without that sign-in
   holds ciphertext only. */
const VAULT = { key: null };
const VAULT_FILE = 'thalamus-vault-key.json';
function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function vaultKeyFromDrive() {
  const q = encodeURIComponent(`name='${VAULT_FILE}'`);
  const found = await (await gfetch(`${DAPI}?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`)).json();
  let raw;
  if (found.files?.length) raw = unb64((await (await gfetch(`${DAPI}/${found.files[0].id}?alt=media`)).json()).k);
  else {
    raw = crypto.getRandomValues(new Uint8Array(32));
    const boundary = 'thl' + Math.random().toString(36).slice(2);
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: VAULT_FILE, parents: ['appDataFolder'] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ v: 1, k: b64(raw), created: new Date().toISOString() })}\r\n--${boundary}--`;
    await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
  }
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, VAULT.key, new TextEncoder().encode(JSON.stringify(obj)));
  return { enc: 1, iv: b64(iv), ct: b64(ct) };
}
async function unseal(w) { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(w.iv) }, VAULT.key, unb64(w.ct)))); }
async function sealBlob(blob) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv, data: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, VAULT.key, await blob.arrayBuffer()) }; }
// sign in (must start inside the tap), fetch the key, open what was stored sealed
async function vaultUnlock() {
  const t = getToken(true); await t;
  VAULT.key = await vaultKeyFromDrive();
  if (LOCKED.session) { session = await unseal(LOCKED.session); LOCKED.session = null; }
  if (LOCKED.patients) { patients = await unseal(LOCKED.patients); LOCKED.patients = null; }
}
const isLocked = () => !!(settings.encrypt && !VAULT.key && (LOCKED.session || LOCKED.patients));
async function setEncryption(on) {
  if (on) {
    await vaultUnlock();
    settings.encrypt = true; saveSettings();
    saveSession(true); savePatients(); await resealAudio(true);
    toast('הנתונים במכשיר מוצפנים. הפתיחה הבאה תבקש התחברות ל-Google.', false, 5000);
  } else {
    if (!VAULT.key) await vaultUnlock();
    settings.encrypt = false; saveSettings();
    saveSession(true); savePatients(); await resealAudio(false);
    toast('ההצפנה כבויה. הנתונים במכשיר נשמרים בלי הצפנה.', false, 4000);
  }
}
function renderLocked(err = '') {
  document.body.className = 'home';
  $('#app').innerHTML = `<div class="shell"><main class="main"><div class="content lock">
    <div class="hero-title"><h1><span class="logo">${ICON.mark}</span>Thalamus</h1><p>הנתונים במכשיר מוצפנים. כדי לפתוח אותם, התחבר עם חשבון Google שבו הוגדרה ההצפנה.</p></div>
    <section class="card"><button class="btn primary block" data-act="unlock">${ICON.key} פתח עם Google</button>
      ${err ? `<div class="err" role="alert" style="margin-top:12px">${esc(err)}</div>` : ''}
      <p class="fine">המפתח נשמר בתיקייה נסתרת של האפליקציה ב-Google Drive שלך, ונשאר רק בזיכרון של הדפדפן עד שהדף נסגר.</p></section>
    <button class="linkbtn small" style="justify-self:center" data-act="vaultReset">אין לי גישה לחשבון: מחק את הנתונים המוצפנים במכשיר</button>
  </div></main></div>`;
}

const KB_CACHE = 'ca-kb-v1', KB_PARSER = 2;
// the decision map is the home page of the same site (this app lives in /app/)
const HAS_MAP = /\/app\/(index\.html)?$/.test(location.pathname);
const SITE_SRC = HAS_MAP ? new URL('../index.html', location.href).href : 'https://raw.githubusercontent.com/PlatonStatovsky/athletic-therapy-map/main/index.html';
const MAP_URL = HAS_MAP ? new URL('../', location.href).href : '';
const MT = { gdoc: 'application/vnd.google-apps.document', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf' };
const kbMem = new Map();
const kbKeyUrl = k => new URL('./__kb/' + encodeURIComponent(k), location.href).href;
async function kbGet(k) {
  if (kbMem.has(k)) return kbMem.get(k);
  try { const r = await (await caches.open(KB_CACHE)).match(kbKeyUrl(k)); if (r) { const v = await r.json(); kbMem.set(k, v); return v; } } catch { }
  return null;
}
async function kbPut(k, v) {
  kbMem.set(k, v);
  try { await (await caches.open(KB_CACHE)).put(kbKeyUrl(k), new Response(JSON.stringify(v), { headers: { 'content-type': 'application/json' } })); } catch { }
}
const libs = {};
function loadScript(src) {
  return libs[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = () => { delete libs[src]; rej(new Error(`הקובץ ${src} לא נטען — ודא שכל קבצי האפליקציה הועלו לאתר`)); };
    document.head.appendChild(s);
  });
}
function pdfLib() {
  return libs.pdf ||= import(new URL('pdf.min.js', location.href).href).then(m => {
    m.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.js', location.href).href; return m;
  }).catch(e => { delete libs.pdf; throw new Error('ספריית ה-PDF לא נטענה (pdf.min.js): ' + e.message); });
}

// --- site ---
async function loadSite(refresh = false) {
  await loadScript('json5.min.js'); await loadScript('kb-site.js');
  const old = await kbGet('site');
  if (old && !refresh && Date.now() - old.at < 36e5) return old; // re-read hourly, so map edits reach the analysis the same day
  try {
    const r = await fetch(SITE_SRC, { cache: 'no-store' });
    if (!r.ok) throw new Error('האתר ' + r.status);
    const v = { data: SiteKB.parseSite(await r.text(), JSON5), src: 'האתר', at: Date.now() };
    await kbPut('site', v); return v;
  } catch (e) {
    if (old) return { ...old, stale: true };
    throw new Error('מפת הדרך לא נטענה: ' + e.message);
  }
}

// --- Drive documents ---
// audio can be larger than a multipart upload allows, so it goes through a resumable upload session
async function uploadBlob(name, blob, parent, mime, existingId) {
  const url = existingId ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=resumable&fields=id`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id';
  let init;
  try {
    init = await gfetch(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(blob.size) },
      body: JSON.stringify(existingId ? { name } : { name, parents: [parent], mimeType: mime })
    });
  } catch (e) {
    if (existingId && (e.status === 404 || e.status === 403)) return uploadBlob(name, blob, parent, mime, null);
    throw e;
  }
  const loc = init.headers.get('Location'); if (!loc) throw new Error('Drive לא החזיר כתובת העלאה');
  const r = await fetch(loc, { method: 'PUT', headers: { 'Content-Type': mime }, body: blob });
  if (!r.ok) throw new Error('העלאת ההקלטה נכשלה (' + r.status + ')');
  return (await r.json()).id;
}
function docIdFrom(s) {
  const m = String(s).match(/\/d\/([a-zA-Z0-9_-]{20,})/) || String(s).match(/[?&]id=([a-zA-Z0-9_-]{20,})/) || String(s).match(/^([a-zA-Z0-9_-]{20,})$/);
  return m ? m[1] : null;
}
const splitList = s => s ? s.split(/[,،]/).map(t => t.trim()).filter(Boolean) : null;
function parseKbDocs(text = settings.kbDocs) {
  return String(text || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
    const [link, tags, parts] = l.split('|').map(x => (x || '').trim());
    const id = docIdFrom(link);
    return id ? { id, regions: splitList(tags), parts: splitList(parts) } : { bad: link };
  });
}
const regionMatch = (regions, region) => !regions || regions.some(r => region.includes(r) || r.includes(region));
const BIDI = /[‎‏‪-‮⁦-⁩]/g;
function cleanText(t) {
  return String(t || '')
    .replace(/^\[[^\]]+\]:\s*<?data:[^\s>]*>?\s*$/gm, '')      // markdown image definitions (base64)
    .replace(/!\[[^\]]*\]\((?:data:[^)]*|[^)]*)\)/g, '')       // inline images
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')                      // reference images
    .replace(/data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{100,}/gi, '')
    .replace(BIDI, '').replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  const txt = n => n.textContent.replace(/\s+/g, ' ').trim();
  const list = (el, depth) => {
    for (const li of el.children) {
      if (li.tagName !== 'LI') continue;
      const c = li.cloneNode(true); c.querySelectorAll('ul,ol').forEach(x => x.remove());
      const t = txt(c); if (t) out.push('  '.repeat(depth) + '- ' + t);
      li.querySelectorAll(':scope > ul, :scope > ol').forEach(x => list(x, depth + 1));
    }
  };
  for (const el of doc.body.children) {
    const tag = el.tagName;
    if (/^H[1-6]$/.test(tag)) { const t = txt(el); if (t) out.push('', '#'.repeat(+tag[1]) + ' ' + t); }
    else if (tag === 'UL' || tag === 'OL') list(el, 0);
    else if (tag === 'TABLE') {
      for (const tr of el.querySelectorAll('tr')) {
        if (tr.closest('table') !== el) continue;
        const cells = [...tr.children].map(txt);
        if (cells.some(Boolean)) out.push('| ' + cells.join(' | ') + ' |');
      }
      out.push('');
    } else { const t = txt(el); if (t) out.push(t, ''); }
  }
  return out.join('\n');
}
async function pdfToText(buf) {
  const pdfjs = await pdfLib();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  let out = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    let line = '', prev = null;
    for (const it of tc.items) {
      if (prev && it.str && line && !/\s$/.test(line) && !/^\s/.test(it.str)) {
        const x1 = prev.transform[4], w1 = prev.width, x2 = it.transform[4], w2 = it.width;
        const gap = Math.min(Math.abs(x2 - (x1 + w1)), Math.abs(x1 - (x2 + w2)));
        if (Math.abs(prev.transform[5] - it.transform[5]) > 2 || gap > 0.8) line += ' ';
      }
      line += it.str;
      if (it.str) prev = it;
      if (it.hasEOL) { out += line.trimEnd() + '\n'; line = ''; prev = null; }
    }
    out += line + '\n\n';
  }
  doc.destroy?.();
  return out;
}
async function driveDocText(id, meta) {
  const media = () => gfetch(`${DAPI}/${id}?alt=media`);
  if (meta.mimeType === MT.gdoc) {
    try { return await (await gfetch(`${DAPI}/${id}/export?mimeType=text%2Fmarkdown`)).text(); }
    catch { return await (await gfetch(`${DAPI}/${id}/export?mimeType=text%2Fplain`)).text(); }
  }
  if (meta.mimeType === MT.docx) {
    await loadScript('mammoth.browser.min.js');
    const r = await mammoth.convertToHtml({ arrayBuffer: await (await media()).arrayBuffer() });
    return htmlToText(r.value);
  }
  if (meta.mimeType === MT.pdf) return pdfToText(await (await media()).arrayBuffer());
  if (/^text\//.test(meta.mimeType) || /json|markdown/.test(meta.mimeType)) return (await media()).text();
  if (meta.mimeType.startsWith('application/vnd.google-apps.')) return (await gfetch(`${DAPI}/${id}/export?mimeType=text%2Fplain`)).text();
  throw new Error(`"${meta.name}": סוג קובץ לא נתמך (${meta.mimeType}) — אפשר Google Docs, ‏docx, ‏PDF או טקסט`);
}
// cached per file id; re-read when the file changed in Drive
async function fetchDoc(id, refresh = false) {
  const c = await kbGet('doc:' + id);
  if (c && !refresh && c.ver === KB_PARSER && Date.now() - c.checked < 12 * 36e5) return c;
  let meta;
  try { meta = await (await gfetch(`${DAPI}/${id}?fields=name,mimeType,modifiedTime`)).json(); }
  catch (e) {
    if (c && e.status !== 404) return { ...c, stale: true };
    throw new Error(e.status === 404 ? `קובץ לא נמצא או אין גישה (${id.slice(0, 8)}…)` : e.message);
  }
  if (c && !refresh && c.ver === KB_PARSER && c.modified === meta.modifiedTime) { const v = { ...c, checked: Date.now() }; await kbPut('doc:' + id, v); return v; }
  let text;
  try { text = cleanText(await driveDocText(id, meta)); }
  catch (e) { throw new Error(`"${meta.name}": ${e.message}`); }
  if (!text) throw new Error(`"${meta.name}": לא נמצא בו טקסט`);
  const v = { title: meta.name.replace(/\.(docx|pdf|txt|md)$/i, '').trim(), text, modified: meta.modifiedTime, checked: Date.now(), ver: KB_PARSER };
  await kbPut('doc:' + id, v);
  return v;
}
// keep only named parts of a document, e.g. "חלק ה": from that heading to the next heading of the same kind
const headNorm = s => s.replace(BIDI, '').replace(/^[\s#*>|_•·\-–—]+/, '').replace(/[׳'״"*]/g, '').replace(/\s+/g, ' ').trim();
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pickParts(text, parts) {
  const lines = text.split('\n'), heads = lines.map(headNorm);
  const found = [], missing = [];
  for (const p of parts) {
    const key = headNorm(p), fam = key.split(' ')[0];
    const keyRe = new RegExp('^' + reEsc(key) + '(?=$|[\\s—–\\-:.)])');
    const famRe = new RegExp('^' + reEsc(fam) + ' (?:[א-ת]|\\d{1,2}|[IVX]{1,4})(?=$|[\\s—–\\-:.)])');
    let best = '';
    for (let i = 0; i < lines.length; i++) {
      if (heads[i].length > 140 || !keyRe.test(heads[i])) continue;
      let j = i + 1;
      while (j < lines.length && !(heads[j].length <= 140 && famRe.test(heads[j]))) j++;
      const seg = lines.slice(i, j).join('\n');
      if (seg.length > best.length) best = seg;
    }
    if (best) found.push(best.trim()); else missing.push(p);
  }
  return { text: found.join('\n\n'), missing };
}
// everything the analysis of one region gets, in priority order, within the character budget
async function loadKB(region, refresh = false, onStep = () => { }) {
  const docs = [], problems = [];
  if (settings.siteKB) {
    onStep('מפת הדרך מהאתר');
    try {
      const st = await loadSite(refresh);
      docs.push({ title: 'מפת דרך — שיקום שמרני', text: SiteKB.regionText(st.data, region) });
      if (st.stale) problems.push('מפת הדרך לא נטענה עכשיו — נעשה שימוש בעותק שמור');
    } catch (e) { problems.push(e.message); }
  }
  const entries = parseKbDocs();
  entries.filter(d => d.bad).forEach(d => problems.push('שורה לא מזוהה: ' + d.bad.slice(0, 40)));
  const wanted = entries.filter(d => d.id && regionMatch(d.regions, region))
    .map((d, i) => ({ ...d, i })).sort((a, b) => ((a.regions ? 0 : 1) - (b.regions ? 0 : 1)) || a.i - b.i);
  if (wanted.length && !settings.clientId) problems.push('Drive לא מחובר — הסיכומים לא נטענו');
  else for (const [k, d] of wanted.entries()) {
    try {
      onStep(`סיכומים מ-Drive ${k + 1}/${wanted.length}`);
      const c = await fetchDoc(d.id, refresh);
      let text = c.text, title = c.title;
      if (d.parts) {
        const r = pickParts(text, d.parts);
        if (r.missing.length) problems.push(`"${c.title}": לא נמצא ${r.missing.join(', ')}${r.text ? '' : ' — נטען המסמך כולו'}`);
        if (r.text) { text = r.text; title += ' — ' + d.parts.join(', '); }
      }
      if (c.stale) problems.push(`"${c.title}": Drive לא זמין — עותק שמור`);
      docs.push({ title, text });
    } catch (e) { problems.push(e.message); }
  }
  if (settings.extraKB.trim()) docs.push({ title: 'ידע נוסף (הגדרות)', text: settings.extraKB.trim() });
  const budget = Math.max(20, +settings.kbBudget || 350) * 1000, kept = [], skipped = [];
  let used = 0;
  for (const d of docs) {
    if (used >= budget) { skipped.push(d.title); continue; }
    if (used + d.text.length > budget) { d.text = d.text.slice(0, budget - used) + '\n[…קוצר — תקרת בסיס הידע…]'; problems.push(`"${d.title}" קוצר`); }
    used += d.text.length; kept.push(d);
  }
  if (skipped.length) problems.push('לא נכנסו בגלל תקרת התווים: ' + skipped.join(', '));
  return { docs: kept, problems, chars: used };
}
const kChars = n => n < 10000 ? (n / 1000).toFixed(1) + 'K' : Math.round(n / 1000) + 'K';
const kbBlock = docs => docs.map(d => `<document title="${d.title.replace(/"/g, '')}">\n${d.text}\n</document>`).join('\n\n');

/* ---------------- analysis ---------------- */
const ANALYSIS_SYSTEM = `You are a clinical-reasoning assistant for a sports therapist (ספורט-תרפיסט) in Israel. You receive (1) the therapist's own knowledge base, (2) the session form, (3) the raw speech-recognition transcript (recognition errors; lines may carry [דובר N] speaker labels).

The knowledge base has up to three kinds of documents:
- "מפת דרך — שיקום שמרני": the therapist's verified decision map (his own site, built from open verified sources). A general 8-stage framework and principles for every region; for neck, shoulder, elbow and wrist/hand also the region chapter — red-flag screening, classification paths, test order with LR values, treatment, prognosis, and test cards.
- Lesson summaries from the therapist's courses, chosen for this region, plus general lessons (clinical reasoning, bone, muscle).
- Parts of the therapist's clinical tests compendium (מאגר מבדקים).

Write a working analysis in Hebrew that helps the therapist decide what to do next. It is a draft for the therapist's judgement: "הבחנה, לא אבחנה".

Rules:
- Ground the reasoning in the knowledge base first: its stages, red-flag rules, test order, clusters and LR values where they apply. Name the source you used, e.g. "(מפת דרך — כתף, SAPS)" or "(סיכום שיעור 8)".
- Where the decision map covers the region, follow its order of stages. If two sources disagree, prefer the decision map and point out the disagreement in one line.
- If the knowledge base does not cover this region or question, say so once and mark statements from general knowledge with "(ידע כללי)".
- Use only findings that appear in the form or transcript. Never invent results. If the form and transcript disagree, say so.
- Concise and telegraphic. Keep standard English clinical terms.
- If anything suggests stopping and referring, put it in the first line in bold.

Colour-code the status of tests, questions and screening items with these inline markers (the app renders them as coloured highlights):
- [[done: …]] green — already done in this session, with its result. Example: [[done: Hawkins-Kennedy ימין — חיובי]]
- [[rec: …]] orange — recommended to test or ask next. Example: [[rec: Painful arc]]
- [[must: …]] red — must test, ask or rule out before going on or treating: red flags, serious differentials, safety. Example: [[must: לשלול כאב לילה לא מכני]]
Wrap a short phrase (the item and a few words), never a whole paragraph, and never nest markers. Use them mostly in דגלים, מבדקים and מידע חסר; in other sections only where the status matters.

Structure, with these exact headings:
## סיכום קליני
3–5 lines.
## דגלים
Red flags: what was asked, what came up, what was NOT asked and still needs asking. Yellow flags.
## השערות עבודה
Leading hypothesis + 1–2 alternatives. For each: בעד / נגד / מה יכריע.
## מבדקים
What was done and how to read it (cluster, LR). What to test next, in order from gentle to provocative. What not to do yet (irritability, acute stage).
## מידע חסר
Questions not asked or key fields still empty.
## כיוון טיפולי ומטרות
Baseline measures for follow-up, short / medium / long-term goals, treatment principles for the current stage.
## מתי להפנות
Case-specific referral criteria.`;
function formAsText(s) {
  return sectionsFor(s).map(sec => `### ${sec.title}\n` + sec.fields.map(f => {
    const v = s.fields[f.id];
    return `- ${f.label}: ${v?.value ? v.value + (v.needsCheck ? ' [לא אומת]' : '') : '—'}`;
  }).join('\n')).join('\n\n');
}
let analysisAbort = null;
async function runAnalysis() {
  const s = session; if (!s) return;
  if (!aiReady()) { toast('חסר קוד גישה. אפשר להוסיף אותו בהגדרות, בלשונית API.', true); return; }
  const out = $('#analysisOut'), st = $('#analysisStatus'), btn = $('#analysisBtn');
  btn.disabled = true;
  st.innerHTML = '<span class="spin"></span> טוען בסיס ידע…';
  let kb = { docs: [], problems: [], chars: 0 };
  try { kb = await loadKB(s.region, false, step => { st.innerHTML = `<span class="spin"></span> טוען בסיס ידע: ${esc(step)}…`; }); }
  catch (e) { kb.problems.push(e.message); }
  const transcript = buildTranscript(s.segments);
  const tr = transcript.length > 120000 ? '[…תחילת התמלול קוצרה…]\n' + transcript.slice(-120000) : transcript;
  const content = [];
  // the knowledge base is the long, stable part — cached, so a re-run within a few minutes costs a fraction
  if (kb.docs.length) content.push({ type: 'text', text: `<knowledge_base>\n${kbBlock(kb.docs)}\n</knowledge_base>`, cache_control: { type: 'ephemeral' } });
  content.push({ type: 'text', text: `אזור: ${s.region}\nסוג מפגש: ${s.type}\nתאריך: ${fmtDate(s.startedAt)}\n\n<form>\n${formAsText(s)}\n</form>\n\n<transcript>\n${tr || '(אין תמלול)'}\n</transcript>\n\nכתוב את הניתוח לפי המבנה.` });
  const kbLine = kb.docs.length ? `בסיס ידע (${Math.round(kb.chars / 1000)}K תווים): ${kb.docs.map(d => esc(d.title)).join(' · ')}` : 'בלי בסיס ידע';
  st.innerHTML = `<span class="spin"></span> חושב… <div class="small muted">${kbLine}</div>`;
  analysisAbort = new AbortController();
  try {
    const res = await callClaude({
      model: settings.analysisModel, max_tokens: 16000,
      system: ANALYSIS_SYSTEM, messages: [{ role: 'user', content }]
    }, { signal: analysisAbort.signal, onText: t => { out.innerHTML = md(t); } });
    if (session !== s) return;
    s.analysis = res.text; s.analysisAt = Date.now(); s.analysisKB = kb.docs.map(d => d.title);
    saveSession(true); touch();
    out.innerHTML = md(res.text); renderTestLinks();
    st.innerHTML = (res.stop_reason === 'max_tokens' ? 'התשובה נקטעה באורך המקסימלי. ' : '') +
      `נוצר ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} · עלות ≈ $${(res.cost || 0).toFixed(2)}` +
      `<div class="small muted">${kbLine}</div>` +
      (kb.problems.length ? `<div class="small" style="color:var(--warn)">${kb.problems.map(esc).join('<br>')}</div>` : '');
  } catch (e) {
    if (e.name !== 'AbortError') st.innerHTML = `<span style="color:var(--hl-must-ink)">הניתוח נכשל: ${esc(humanErr(e))}</span> <button class="linkbtn" data-act="analyze" data-retry="1">נסה שוב</button>`;
  } finally {
    btn.disabled = false; btn.textContent = 'הפק ניתוח מחדש'; analysisAbort = null;
  }
}
// status highlights: [[done: …]] green, [[rec: …]] orange, [[must: …]] red. In Drive documents inline colours are used.
const HL = { done: ['#d4f0db', '#1d5a2f'], rec: ['#ffe2b8', '#7a4300'], must: ['#ffd3cc', '#8e1f15'] };
const HL_LABEL = { done: 'נבדק', rec: 'מומלץ לבדוק', must: 'חובה לבדוק / לשלול' };
function hlSpan(kind, text, forDoc) {
  return forDoc ? `<span style="background-color:${HL[kind][0]};color:${HL[kind][1]}">${text}</span>` : `<mark class="hl hl-${kind}">${text}</mark>`;
}
function md(src, forDoc = false) {
  const lines = esc(src).split('\n');
  let html = '', list = false;
  const inline = t => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[\[(done|rec|must):\s*(.+?)\]\]/g, (m, k, x) => hlSpan(k, x, forDoc))
    .replace(/\[\[(done|rec|must):\s*([^\]]*)\]?$/, (m, k, x) => hlSpan(k, x, forDoc)); // unclosed at line end (while streaming)
  const close = () => { if (list) { html += '</ul>'; list = false; } };
  for (const l of lines) {
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    const li = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (h) { close(); const lv = Math.min(h[1].length + 1, 4); html += `<h${lv}>${inline(h[2])}</h${lv}>`; }
    else if (li) { if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(li[1])}</li>`; }
    else if (!l.trim()) close();
    else { close(); html += `<p>${inline(l)}</p>`; }
  }
  close();
  return html;
}

/* ---------------- documents for Drive ---------------- */
const rtl = h => h.replace(/<(p|h[1-6]|li|ul)>/g, '<$1 dir="rtl" style="direction:rtl;text-align:right">');
function sessionDocHtml(s) {
  const v = id => s.fields[id]?.value;
  let h = `<h1>מפגש — ${esc(s.patientName)}</h1>`;
  h += `<p>תאריך: ${fmtWhen(s.startedAt)} · אזור: ${esc(s.region)} · ${esc(s.type)}</p>`;
  h += `<p>הסכמת המטופל להקלטה: ניתנה, ${fmtWhen(s.consentAt || s.startedAt)}</p>`;
  h += recordDocHtml(s) + vizDocHtml(s) + notesDocHtml(s);
  h += `<h2>הטופס</h2>`;
  for (const sec of sectionsFor(s)) {
    h += `<h2>${esc(sec.title)}</h2>`;
    for (const f of sec.fields) {
      const val = v(f.id);
      const chk = s.fields[f.id]?.needsCheck ? ' [לא אומת]' : '';
      h += `<p><b>${esc(f.label)}:</b> ${val ? esc(val).replace(/\n/g, '<br>') + chk : '—'}</p>`;
    }
  }
  if (s.analysis) {
    h += `<h2>ניתוח קליני — טיוטה לשיקול דעת המטפל</h2>`;
    if (/\[\[(done|rec|must):/.test(s.analysis)) h += `<p>מקרא: ${Object.keys(HL_LABEL).map(k => hlSpan(k, HL_LABEL[k], true)).join(' · ')}</p>`;
    h += md(s.analysis, true);
    if (s.analysisKB?.length) h += `<p><i>בסיס ידע: ${esc(s.analysisKB.join(', '))}</i></p>`;
  }
  h += `<p><i>הופק ב-Thalamus, העוזר הקליני. שדות שמולאו אוטומטית מתוך תמלול: יש לאמת מול המטופל.</i></p>`;
  return `<html><head><meta charset="utf-8"></head><body dir="rtl">${rtl(h)}</body></html>`;
}
// the live record, the visual summary and the notes, as text and tables a Google Doc keeps
const docTable = (head, rows) => `<table dir="rtl" border="1" cellpadding="5" style="border-collapse:collapse;direction:rtl"><tr>${head.map(x => `<th style="text-align:right">${x}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td style="text-align:right">${c}</td>`).join('')}</tr>`).join('')}</table>`;
function recordDocHtml(s) {
  const rec = s.ins?.record || {}, secs = sectionsFor(s).filter(sec => rec[sec.id]?.text);
  return secs.length ? `<h2>רשומה קלינית</h2>` + secs.map(sec => `<p><b>${esc(sec.title)}:</b> ${esc(rec[sec.id].text)}</p>`).join('') : '';
}
function vizDocHtml(s) {
  const ins = s.ins; if (!ins) return '';
  const unv = ids => unvOf(s, ids) ? ' [לא אומת]' : '';
  let h = '';
  const vm = vasOf(s.fields.vas_max?.value), vn = vasOf(s.fields.vas_now?.value);
  if (vm != null || vn != null || ins.timeline?.length) {
    h += '<h3>מהלך הפציעה</h3>';
    if (vm != null || vn != null) h += `<p>כאב מירבי: ${vm ?? '—'}/10 · כאב עכשיו: ${vn ?? '—'}/10</p>`;
    if (ins.timeline?.length) h += docTable(['מתי', 'אירוע', 'כאב (0–10)'], [...ins.timeline].sort((a, b) => (b.days_ago < 0 ? -1 : b.days_ago) - (a.days_ago < 0 ? -1 : a.days_ago)).map(t => [esc(t.when || '—'), esc(t.event) + unv(t.fields), t.vas >= 0 ? t.vas + (PAIN_STATE_HE[t.pain_state] ? ' ' + PAIN_STATE_HE[t.pain_state] : '') : '—']));
  }
  if (ins.body?.length) h += '<h3>מיקום הסימפטומים</h3>' + docTable(['אזור', 'צד', 'סוג', 'תיאור'], ins.body.map(b => [ZONE_HE[b.zone], SIDE_HE[b.side] || '—', KIND_HE[b.kind], esc(b.label || '') + unv(b.fields)]));
  const ex = ins.exam || {};
  if (ex.rom?.length) {
    const m = [...new Set(ex.rom.map(r => r.motion.trim()))];
    h += '<h3>טווחי תנועה</h3>' + docTable(['תנועה', 'ימין', 'שמאל', 'צד לא צוין', 'כאב', 'טווח תקין'], m.map(k => { const rs = ex.rom.filter(r => r.motion.trim() === k), g = sd => { const r = rs.find(x => x.side === sd); return r ? r.degrees + '°' + unv(r.fields) : '—'; }, nm = romNorm(k, rs.find(r => r.joint)?.joint, s.region); return [esc(k), g('right'), g('left'), g('none'), rs.some(r => r.painful) ? 'כן' : '', nm ? nm.deg + '°' : '—']; }));
  }
  if (ex.mmt?.length) {
    const m = [...new Set(ex.mmt.map(r => r.motion.trim()))], gr = g => g === 4.5 ? '4+' : g === 3.75 ? '4-' : String(g);
    h += '<h3>כוח (MMT)</h3>' + docTable(['שריר / תנועה', 'ימין', 'שמאל', 'צד לא צוין'], m.map(k => { const rs = ex.mmt.filter(r => r.motion.trim() === k), g = sd => { const r = rs.find(x => x.side === sd); return r ? gr(r.grade) + '/5' + unv(r.fields) : '—'; }; return [esc(k), g('right'), g('left'), g('none')]; }));
  }
  if (ex.tests?.length) h += '<h3>מבדקים מיוחדים</h3>' + docTable(['מבדק', 'צד', 'תוצאה'], ex.tests.map(t => [esc(t.name), SIDE_HE[t.side] || '—', esc(resultText(t)) + unv(t.fields)]));
  if (ins.hypo?.length) h += '<h3>השערות עבודה (טיוטה לחשיבה קלינית, לא אבחנה)</h3>' + docTable(['השערה', 'מצב', 'תומך', 'סותר', 'מבדקים שיעזרו להבחין'], ins.hypo.map(x => [esc(x.name), STATUS_HE[x.status] || '', esc((x.support || []).join(' · ')), esc((x.against || []).join(' · ')), esc((x.tests || []).map(testName).join(', '))]));
  return h ? '<h2>סיכום חזותי</h2>' + h : '';
}
function notesDocHtml(s) {
  const n = s.notes || []; if (!n.length) return '';
  return '<h2>פתקים ומשימות</h2><ul>' + n.map(x => `<li>${esc(x.text)}${x.field && FIELD[x.field] ? ` (נוסף לשדה: ${esc(shortLabel(FIELD[x.field].label))})` : ''}${x.task ? ` · משימה: ${esc(x.task)}${x.done ? ' (בוצע)' : ''}` : ''}</li>`).join('') + '</ul>';
}
function transcriptDocHtml(s) {
  let h = `<h1>תמלול — ${esc(s.patientName)} — ${fmtWhen(s.startedAt)}</h1>`, last = null;
  for (const g of s.segments) {
    if (g.stage !== last) { h += `<h2>${esc(STAGES.find(x => x.id === g.stage)?.label || g.stage)}</h2>`; last = g.stage; }
    const d = new Date(g.t), pos = recPos(s, g);
    h += `<p>[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${pos ? ' · בהקלטה ' + pos : ''}] ${g.speaker != null ? `<b>דובר ${esc(g.speaker)}:</b> ` : ''}${esc(g.text)}${g.manual ? ' (הוקלד)' : ''}</p>`;
  }
  return `<html><head><meta charset="utf-8"></head><body dir="rtl">${rtl(h)}</body></html>`;
}
async function saveToDrive(onProgress = () => { }) {
  const s = session; if (!s) return;
  onProgress('מתחבר ל-Google…');
  const root = await ensureRoot();
  const folder = await ensurePatientFolder(root, s.patientName);
  const stamp = fmtStamp(s.startedAt);
  onProgress('שומר את מסמך המפגש…');
  s.docId = await upsertDoc(s.docId, `מפגש ${stamp} — ${s.patientName}`, sessionDocHtml(s), folder);
  if (s.segments.length) { onProgress('שומר את התמלול…'); s.transcriptDocId = await upsertDoc(s.transcriptDocId, `תמלול ${stamp} — ${s.patientName}`, transcriptDocHtml(s), folder); }
  let parts = []; try { parts = await audioParts(s.id); } catch { }
  s.audioIds = s.audioIds || {};
  for (const p of parts) {
    if (s.audioIds[p.part]?.size === p.blob.size) continue; // already in Drive, unchanged
    onProgress(`מעלה הקלטה${parts.length > 1 ? ' ' + p.part : ''} (${fmtBytes(p.blob.size)})…`);
    const ext = /mp4/.test(p.mime) ? 'm4a' : /ogg/.test(p.mime) ? 'ogg' : 'webm';
    const id = await uploadBlob(`הקלטה ${stamp}${parts.length > 1 ? ' חלק ' + p.part : ''} — ${s.patientName}.${ext}`, p.blob, folder, p.mime.split(';')[0], s.audioIds[p.part]?.id);
    s.audioIds[p.part] = { id, size: p.blob.size };
  }
  s.folderId = folder; s.savedAt = Date.now(); s.changedAt = s.savedAt;
  upsertPatient({ name: s.patientName, folderId: folder, region: s.region, last: s.startedAt });
  saveSession(true); renderAudioBox(); renderSaveState();
  return folder;
}
function downloadCopy() {
  const s = session; if (!s) return;
  const blob = new Blob([sessionDocHtml(s).replace('</body>', transcriptDocHtml(s).replace(/^[\s\S]*?<body dir="rtl">|<\/body>[\s\S]*$/g, '') + '</body>')], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `מפגש ${fmtStamp(s.startedAt).replace(':', '-')} ${s.patientName}.html`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function upsertPatient(p) {
  const i = patients.findIndex(x => x.name === p.name);
  if (i >= 0) patients[i] = { ...patients[i], ...Object.fromEntries(Object.entries(p).filter(([, v]) => v)) };
  else patients.unshift(p);
  patients.sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')));
  savePatients();
}

/* ---------------- views ---------------- */
let view = session ? 'session' : 'home', tab = 'live';
function go(v) { if (v !== 'session') stopPlayer(); closePop(); view = v; render(); window.scrollTo(0, 0); }
const hhmm = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const shortLabel = l => l.split(' — ')[0].split(' (')[0];
const stageLabel = id => STAGES.find(x => x.id === id)?.label || '';
const stageFields = (s, id) => { const st = STAGES.find(x => x.id === id) || STAGES[0]; return sectionsFor(s).filter(sec => st.sections.includes(sec.id)).flatMap(sec => sec.fields); };

/* ---------------- finishing a session: stop, verify what the AI filled, see the picture, save ---------------- */
let fin = { phase: 'review', msg: '', err: '', filling: false };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function openFinish() {
  if (!session) return;
  const wasRec = recording;
  fin = { phase: wasRec ? 'stopping' : 'review', msg: '', err: '', filling: false };
  if (wasRec) stopRec();
  go('finish');
  if (wasRec) { await sleep(useSoniox() ? 5200 : 1200); fin.phase = 'review'; }
  // whatever was said since the last fill goes into the form before the review
  if (session && aiReady() && (filling || pendingChars())) {
    fin.filling = true; if (view === 'finish') renderFinish();
    if (filling) { while (filling) await sleep(300); } else await runFill();
    fin.filling = false;
  }
  if (view === 'finish') renderFinish();
  // the visual summary is drawn from everything collected; bring it up to date once
  if (session && aiReady() && smartAny()) { await runInsight(true); if (view === 'finish') renderFinish(); }
}
const needsReview = f => { const v = session.fields[f.id]; return v?.value && (v.needsCheck || v.unverified); };
function verRowHtml(f) {
  const v = session.fields[f.id];
  return `<div class="vrow" id="v-${f.id}"><div class="vmain"><div class="vl"><b>${esc(shortLabel(f.label))}</b>${v.unverified ? '<span class="badge bad">לא נמצא בתמלול</span>' : '<span class="badge chk">לאמת</span>'}</div>
    <textarea class="vin" id="vt-${f.id}" rows="1" aria-label="${esc(f.label)}">${esc(v.value)}</textarea>
    ${v.quote ? `<div class="vq">${v.unverified ? 'המודל ציטט, אבל זה לא נמצא בתמלול' : v.asked ? 'נשען על שאלה של המטפל' : 'נשמע בתמלול'}: «${esc(v.quote)}»</div>` : ''}</div>
    <div class="vb"><button class="btn primary sm" data-act="vConfirm" data-fid="${f.id}">אשר</button><button class="btn sm" data-act="vClear" data-fid="${f.id}">נקה</button></div></div>`;
}
function saveRowHtml(nv) {
  const s = session;
  if (fin.phase === 'saving') return `<button class="btn primary block" disabled><span class="spin"></span> ${esc(fin.msg || 'שומר…')}</button>`;
  if (fin.phase === 'saved') return `<div class="done" role="status">נשמר ב-Drive · מטופלים › ${esc(s.patientName)} · ${hhmm(s.savedAt)}${s.folderId ? ` · <a href="https://drive.google.com/drive/folders/${encodeURIComponent(s.folderId)}" target="_blank" rel="noopener">פתח את התיקייה</a>` : ''}</div>
    <button class="btn block danger" data-act="discard">סגור את המפגש ומחק אותו מהמכשיר</button>
    <button class="btn block" data-act="resume">חזרה למפגש</button>`;
  const err = fin.err ? `<div class="err" role="alert">השמירה נכשלה: ${esc(fin.err)}</div>` : '';
  if (!settings.clientId) return err + `<div class="err">כדי לשמור ל-Drive צריך Google Client ID בהגדרות, בלשונית API.</div><button class="btn block" data-act="settings" data-tab="api">להגדרות API</button>`;
  return err + (nv ? `<p class="muted small">${nv === 1 ? 'שדה אחד שלא אומת יסומן' : nv + ' שדות שלא אומתו יסומנו'} במסמך כ"לא אומת".</p>` : '') +
    `<button class="btn primary block" data-act="saveDrive" ${fin.phase !== 'review' || fin.filling ? 'disabled' : ''}>${fin.err ? 'נסה שוב' : s.savedAt ? 'עדכן ב-Drive' : 'שמור ל-Drive'}</button>
    <button class="btn block" data-act="resume">חזרה למפגש</button>`;
}
function renderFinish() {
  const s = session; if (!s) { view = 'home'; return renderHome(); }
  document.body.className = 'fin';
  const all = fieldsFor(s), ver = all.filter(needsReview), must = all.filter(f => !s.fields[f.id]?.value && impOf(f) === 1);
  const tasks = (s.notes || []).filter(n => n.task);
  const viz = vizCards('all', true);
  setTimeout(() => $$('.vin').forEach(autosize));
  $('#app').innerHTML = `<div class="shell"><main class="main">
  <div class="toolbar page"><div class="lead"><button class="icon-btn glass" data-act="resume" aria-label="חזרה למפגש">${ICON.back}</button></div>
    <div class="trail"><button class="icon-btn glass" data-act="settings" aria-label="הגדרות">${ICON.gear}</button></div></div>
  <div class="content">
    <div class="ptitle"><div><h1>סיום מפגש</h1><div class="sub">${esc(s.patientName)} · ${esc(s.region)} · ${esc(s.type)} · ${fmtWhen(s.startedAt)}</div></div></div>
    <section class="card fin-sec" aria-labelledby="fRec"><div class="card-h cat-rec"><span class="glyph">${ICON.mic}</span><h2 id="fRec">הקלטה</h2></div>
      <p class="lead">${fin.phase === 'stopping' ? '<span class="spin"></span> עוצר את ההקלטה ומשלים את התמלול…' : `ההקלטה עצורה · ${fmtClock(s.recordedMs || 0)} · ${s.segments.length} שורות בתמלול`}</p>
      ${fin.filling ? '<p class="lead"><span class="spin"></span> ממלא את הטופס ממה שנאמר בסוף…</p>' : ''}
      ${insighting ? '<p class="lead"><span class="spin"></span> מעדכן את הסיכום החזותי…</p>' : ''}</section>
    ${viz.length ? `<h2 class="sr">סיכום חזותי</h2><div class="grid">${viz.join('')}</div>` : ''}
    ${smart().record ? recordHtml() : ''}
    <section class="card fin-sec" aria-labelledby="fVer"><div class="card-h cat-rec"><span class="glyph">${ICON.check}</span><h2 id="fVer">לאימות <span class="muted num">${ver.length}</span></h2></div>
      ${ver.length ? '<p class="lead">שדות שה-AI מילא וצריכים את האישור שלך. אפשר לתקן בשורה עצמה לפני האישור.</p><div class="vrows">' + ver.map(verRowHtml).join('') + '</div>' : '<p class="lead">כל השדות שמולאו אומתו.</p>'}</section>
    ${tasks.length ? `<section class="card fin-sec" aria-labelledby="fTask"><div class="card-h cat-note"><span class="glyph">${ICON.note}</span><h2 id="fTask">משימות מהפתקים <span class="muted num">${tasks.length}</span></h2></div>
      ${notesListHtml(tasks)}</section>` : ''}
    ${must.length ? `<section class="card fin-sec" aria-labelledby="fMust"><div class="card-h cat-gap"><span class="glyph">${ICON.alert}</span><h2 id="fMust">שדות חובה שלא נאמרו <span class="muted num">${must.length}</span></h2></div>
      <p class="lead">אם המטופל עוד כאן, זה הזמן לשאול.</p>
      <div class="mlist">${must.map(f => missRow({ f, imp: 1 })).join('')}</div></section>` : ''}
    <section class="card fin-sec" aria-labelledby="fCon"><div class="card-h cat-str"><span class="glyph">${ICON.check}</span><h2 id="fCon">הסכמה</h2></div>
      <p class="lead">המטופל הסכים להקלטה · סומן ב-${hhmm(new Date(s.consentAt || s.startedAt).getTime())}. ההסכמה נרשמת במסמך המפגש.</p></section>
    <section class="card fin-sec" aria-labelledby="fAn"><div class="card-h cat-hyp"><span class="glyph">${ICON.analysis}</span><h2 id="fAn">ניתוח</h2></div>
      <p class="lead">${s.analysis ? 'הניתוח הופק ב-' + hhmm(s.analysisAt) + ' ויישמר עם המפגש.' : 'עוד לא הופק ניתוח. אפשר לשמור בלעדיו ולהפיק אחר כך.'}</p>
      ${s.analysis ? '' : '<button class="btn" data-act="toAnalysis">להפקת ניתוח</button>'}</section>
    <div class="saverow" id="saveRow">${saveRowHtml(ver.length)}</div>
  </div></main></div>`;
}
function render() {
  applyLayout(); closePop();
  if (isLocked()) return renderLocked();
  if (view === 'finish' && session) return renderFinish();
  if (view === 'session' && session) return renderSession();
  return renderHome();
}

function renderHome() {
  document.body.className = 'home';
  const missing = [!aiReady() && 'קוד גישה (בשביל ה-AI והתמלול)', !settings.clientId && 'Google Client ID (בשביל שמירה ב-Drive)'].filter(Boolean);
  $('#app').innerHTML = `<div class="shell"><main class="main">
  <div class="toolbar page"><div class="lead"></div><div class="trail"><div class="capsule glass">
    ${MAP_URL ? `<a class="icon-btn" href="${MAP_URL}" aria-label="מפת הדרך" title="מפת הדרך">${ICON.map}</a>` : ''}
    <button class="icon-btn" data-act="cycleTheme" aria-label="מצב תצוגה" title="מצב תצוגה">${ICON.theme}</button>
    <button class="icon-btn" data-act="settings" aria-label="הגדרות" title="הגדרות">${ICON.gear}</button></div></div></div>
  <div class="content">
    <div class="hero-title"><h1><span class="logo">${ICON.mark}</span>Thalamus</h1><p>עוזר קליני: מקליט, ממלא, מצייר את התמונה הקלינית ושומר ל-Drive שלך.</p></div>
    ${recPillHtml()}
    ${envProblem() ? `<div class="banner warn">${esc(envProblem())}</div>` : ''}
    ${missing.length ? `<div class="banner warn">כדי להתחיל חסר ${missing.length > 1 ? missing.slice(0, -1).join(', ') + ' ו' + missing.at(-1) : missing[0]}. <a href="#" data-act="settings" data-tab="api">להגדרות API</a></div>` : ''}
    ${session ? `<section class="card"><div class="card-h cat-rec"><span class="glyph">${ICON.live}</span><h2>מפגש פתוח</h2></div>
      <p class="muted">${esc(session.patientName)} · ${esc(session.region)} · ${fmtWhen(session.startedAt)}${session.savedAt ? ' · נשמר ב-Drive' : ' · <b>לא נשמר עדיין</b>'}</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn primary" data-act="resume">המשך מפגש</button><button class="btn danger" data-act="discard">סגור מפגש</button></div></section>` : ''}
    <div class="home-grid">
    <section class="card" aria-labelledby="newH">
      <div class="card-h cat-rec"><span class="glyph">${ICON.plus}</span><h2 id="newH">מפגש חדש</h2></div>
      <label class="lbl" for="pName" style="margin-top:0">שם המטופל</label>
      <input id="pName" class="inp" list="pList" autocomplete="off" placeholder="שם פרטי ומשפחה">
      <datalist id="pList">${patients.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist>
      <label class="lbl" for="pRegion">אזור</label>
      <select id="pRegion" class="inp">${REGIONS.map(r => `<option>${r}</option>`).join('')}</select>
      <span class="lbl" id="pTypeL">סוג</span>
      <div class="seg" role="group" aria-labelledby="pTypeL" id="pType" style="width:100%">${TYPES.map((r, i) => `<button type="button" data-act="ptype" data-v="${r}" aria-pressed="${i === 0}">${r}</button>`).join('')}</div>
      <label class="check"><span>המטופל/ת הסכים/ה להקלטת המפגש ולתמלולו לצורך תיעוד</span><input type="checkbox" role="switch" class="switch" id="pConsent"></label>
      <button class="btn primary block" style="margin-top:16px" data-act="start">התחל מפגש</button>
    </section>
    ${patients.length ? `<section class="card" aria-labelledby="ptH"><div class="card-h cat-str"><span class="glyph">${ICON.person}</span><h2 id="ptH">מטופלים</h2><span class="end meta">${patients.length}</span></div><ul class="list">
      ${patients.slice(0, 30).map(p => `<li><div class="grow"><b>${esc(p.name)}</b><span>${esc(p.region || '')}${p.last ? ' · ' + fmtDate(p.last) : ''}</span></div>
        <button class="btn sm" data-act="pick" data-name="${esc(p.name)}" data-region="${esc(p.region || '')}">מעקב</button></li>`).join('')}
    </ul></section>` : ''}
    </div>
    <p class="muted small" style="text-align:center;margin:16px 0">עלות API מצטברת (הערכה): $${(usage.total || 0).toFixed(2)}</p>
  </div></main></div>`;
}

/* ---------------- the session screen ---------------- */
const NAV = [['live', 'מפגש', 'live'], ['form', 'טופס', 'form'], ['summary', 'סיכום', 'clip'], ['analysis', 'ניתוח', 'analysis']];
function navHtml() {
  return NAV.map(([id, label, ic]) => `<button class="nav-i" data-act="tab" data-tab="${id}"${tab === id ? ' aria-current="page"' : ''}>${ICON[ic]}<span class="lab">${label}</span><span class="n" data-n="${id}"></span></button>`).join('');
}
function renderSession() {
  const s = session;
  document.body.className = 'sess'; syncStage();
  $('#app').innerHTML = `<div class="shell">
  <aside class="rail" aria-label="ניווט"><div class="rail-in glass">
    <button class="home" data-act="home" aria-label="כל המפגשים" title="כל המפגשים"><span class="logo">${ICON.mark}</span><span class="htl"><b>Thalamus</b><span>עוזר קליני</span></span></button>
    <div class="pt"><b>${esc(s.patientName)}</b><span>${esc(s.region)} · ${esc(s.type)}</span></div>
    <nav id="tabs" aria-label="תצוגות המפגש">${navHtml()}</nav>
    <div class="spacer"></div>
    <button class="nav-i" data-act="settings">${ICON.gear}<span class="lab">הגדרות</span></button>
  </div></aside>
  <main class="main">
    <div class="toolbar">
      <div class="lead"><button class="icon-btn glass back" data-act="home" aria-label="כל המפגשים">${ICON.back}</button><span class="sr" id="fillStatus" role="status" aria-live="polite"></span></div>
      ${islandHtml()}
      <div class="trail"><div class="capsule glass tools">
        <button class="icon-btn opt" data-act="focus" aria-pressed="${!!settings.focus}" aria-label="מצב פוקוס" title="מצב פוקוס">${ICON.focus}</button>
        ${!sideShown() && !settings.focus ? `<button class="icon-btn ph-tr" data-act="trOpen" aria-label="פתח את התמלול" title="תמלול">${ICON.chat}<span class="cnt" id="trCountPh">${s.segments.length || ''}</span></button>` : ''}
        <button class="icon-btn" data-act="more" aria-haspopup="dialog" aria-label="עוד: תצוגה, מפה, הגדרות" title="עוד">${ICON.more}</button>
        <button class="btn sm primary" data-act="finish">סיום</button>
      </div></div>
    </div>
    <div class="content" id="tabBody"></div>
    <div id="noteBar"></div>
  </main>
  ${sideShown() ? `<aside class="insp" id="sidePane" aria-label="תמלול"></aside>` : ''}
  </div>
  ${trOverlay() ? `<aside class="insp overlay" id="sidePane" aria-label="תמלול"></aside>` : ''}
  ${!sideShown() && !trOverlay() && !settings.focus ? `<button class="trtab glass" data-act="trOpen" aria-label="פתח את התמלול" title="תמלול">${ICON.chat}<span id="trCount">${s.segments.length || ''}</span></button>` : ''}
  <nav class="tabbar glass" aria-label="תצוגות המפגש">${navHtml()}</nav>`;
  renderTab(); renderRecState(); renderSide(); refreshTabLabels(); tickTimer(); updateIsland();
  setFillStatus(lastStatus.html, lastStatus.err, lastStatus.raw);
}
// wide screens (tablet landscape): the transcript can sit beside the session as an inspector
const WIDE_MQ = matchMedia('(min-width: 1000px)');
let wide = WIDE_MQ.matches;
WIDE_MQ.addEventListener?.('change', e => { wide = e.matches; applyLayout(); if (view === 'session' && session) renderSession(); });
// the therapist's own layout: transcript pane width, focus mode, density
const SIDE_LABEL = { hidden: 'מוסתרת', narrow: 'צרה', medium: 'בינונית', wide: 'רחבה' };
const sideShown = () => wide && (settings.sideW || 'medium') !== 'hidden' && !settings.focus;
let trOpenNarrow = false; // below 1000px the transcript opens as a panel over the session
const trOverlay = () => !wide && trOpenNarrow && !settings.focus;
const TR_SIZE = { narrow: SIDE_LABEL.narrow, medium: SIDE_LABEL.medium, wide: SIDE_LABEL.wide };
function applyLayout() {
  const r = document.documentElement;
  r.dataset.side = settings.sideW || 'medium';
  r.toggleAttribute('data-side-on', view === 'session' && sideShown());
  r.toggleAttribute('data-focus', view === 'session' && !!settings.focus);
  r.dataset.density = settings.density || 'comfortable';
}
applyLayout();
function renderSide() {
  const side = $('#sidePane'); if (!side) return;
  const cur = settings.sideW || 'medium';
  side.innerHTML = `<div class="insp-in" id="inspIn"><div class="insp-h"><h2>תמלול</h2><span class="cnt" id="sideCount">${session.segments.length}</span>
    <span class="end">${wide ? `<span class="seg sz" role="group" aria-label="רוחב חלונית התמלול">${Object.entries(TR_SIZE).map(([k, l]) => `<button data-act="sideW" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</span>` : ''}
    <button class="icon-btn hide" data-act="trHide" aria-label="הסתר את התמלול" title="הסתר">${wide ? ICON.chev : ICON.close}</button></span></div>${transcriptHtml(true)}</div>`;
  renderInterim(); renderAudioBox();
  sideToLatest();
}
// keep the newest transcript line in view (the add box and the recordings sit below it)
function sideToLatest() {
  const box = $('#inspIn'), list = $('#segList'); if (!box || !list) return;
  box.scrollTop = Math.max(0, list.offsetTop + list.offsetHeight + 48 - box.clientHeight);
}
// map deep links: "../#shoulder" opens a region, "../#shoulder&t=hk" also opens a test card
const MAP_TARGET = 'thalamus-map'; // every map link reuses this one tab
const MAP_TAB = { 'צוואר וראש': 'neck', 'כתף': 'shoulder', 'מרפק': 'elbow', 'שורש כף יד וכף יד': 'hand' };
function mapLink(region, testId) { return MAP_URL + '#' + (MAP_TAB[region] || 'general') + (testId ? '&t=' + testId : ''); }
let siteData = null; // the map's data once loaded, for test names and the region a test card lives in
function testHomeTab(id) {
  const d = siteData; if (!d) return MAP_TAB[session?.region] || 'general';
  const own = d.REGIONS.find(x => x.id === MAP_TAB[session?.region]);
  if (own && JSON.stringify(own).includes('"' + id + '"')) return own.id;
  for (const reg of d.REGIONS) if (JSON.stringify(reg).includes('"' + id + '"')) return reg.id;
  return 'general';
}
const testLink = id => MAP_URL && TEST_ID.test(String(id)) ? esc(MAP_URL + '#' + testHomeTab(id) + '&t=' + id) : '';
const testName = id => siteData?.T?.[id]?.n || id;
function testAliases(name) {
  const out = new Set();
  for (let part of String(name).replace(/[–—]/g, '—').split(/—|&| \/ /)) {
    part = part.replace(/\(.*?\)/g, '').replace(/\b(Test|Sign|Score)\b/gi, '').replace(/['’]s\b/g, '').replace(/\s+/g, ' ').trim();
    if (/[A-Za-z]/.test(part) && part.replace(/[^A-Za-z]/g, '').length >= 3) out.add(part);
    const acr = part.match(/^([A-Z]{3,5})(?![A-Za-z])/); if (acr) out.add(acr[1]); // e.g. ULTT 1-3 is also just ULTT
  }
  return [...out];
}
// tests the analysis mentions, as chips that open their card on the map (region of this session first)
async function renderTestLinks() {
  const box = $('#testLinks'); if (!box || !session?.analysis || !settings.siteKB || !MAP_URL) { if (box) box.innerHTML = ''; return; }
  let st; try { st = await loadSite(); siteData = st.data; } catch { return; }
  const T = st.data.T || {}, text = session.analysis.replace(/[–—‐-]/g, '-');
  const found = [];
  for (const [id, t] of Object.entries(T)) {
    const hit = testAliases(t.n).some(a => new RegExp('(^|[^A-Za-z])' + a.replace(/[–—‐-]/g, '-').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/-/g, '[-\\s]?') + '(?![A-Za-z])', 'i').test(text));
    if (hit) found.push([id, t.n]);
  }
  box.innerHTML = found.length ? `<section class="card"><div class="card-h cat-test"><span class="glyph">${ICON.tests}</span><h2>מבדקים שהוזכרו</h2><span class="end meta">פתיחת הכרטיס במפה</span></div>
    <div class="toks">${found.map(([id, n]) => `<a class="chipl" href="${testLink(id)}" target="${MAP_TARGET}">${esc(n)}</a>`).join('')}</div></section>` : '';
}
function ptitleHtml() {
  const s = session;
  return `<div class="ptitle"><div><h1>${esc(s.patientName)}</h1><div class="sub"><button class="rgbtn" data-act="region" aria-haspopup="dialog" aria-label="אזור המפגש: ${esc(s.region)}. לחץ כדי לשנות">${esc(s.region)}${ICON.chev}</button> · ${esc(s.type)} · <span class="savestate" id="saveState" role="status"></span></div></div></div>${regionBanner()}`;
}
function renderTab() {
  if (!NAV.some(n => n[0] === tab)) tab = 'live';
  $$('.nav-i[data-tab]').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const body = $('#tabBody'); if (!body) return;
  body.setAttribute('aria-label', NAV.find(n => n[0] === tab)?.[1] || '');
  if (tab === 'live') body.innerHTML = liveHtml();
  else if (tab === 'form') body.innerHTML = ptitleHtml() + formHtml();
  else if (tab === 'summary') body.innerHTML = ptitleHtml() + summaryHtml();
  else { body.innerHTML = ptitleHtml() + analysisHtml(); renderTestLinks(); }
  if (tab === 'form' || tab === 'summary') $$('#tabBody textarea').forEach(autosize);
  const nb = $('#noteBar');
  if (nb) nb.innerHTML = tab === 'live' && smart().notes ? `<form class="notebar glass${noteFold ? ' folded' : ''}" data-act="noteForm"><button type="button" class="gl" data-act="noteOpen" aria-label="פתק חדש" aria-expanded="${!noteFold}">${ICON.note}</button>
    <input class="ni" id="noteIn" autocomplete="off" placeholder="פתק: מה לבדוק או לזכור" aria-label="פתק חדש: מה לבדוק, מה ראית, מה לזכור">
    <button class="send" data-act="addNote" aria-label="הוסף פתק">${ICON.send}</button></form>` : '';
  renderSaveState();
}
// the session so far as one page: every graphic, the record, and the closing fields (impression, treatment, plan)
function summaryHtml() {
  const s = session, viz = vizCards('all', true);
  const closing = sectionsFor(s).filter(sec => sec.id === 'summary').flatMap(sec => sec.fields);
  const tasks = (s.notes || []).filter(n => n.task);
  return `<section class="card" aria-labelledby="sumH"><div class="card-h cat-rec"><span class="glyph">${ICON.clip}</span><h2 id="sumH">סיכום המפגש</h2><span class="end meta">התרשמות, טיפול והמשך</span></div><div class="fields flat">${closing.map(fieldHtml).join('')}</div></section>` +
    (tasks.length ? `<section class="card cat-note"><div class="card-h"><span class="glyph">${ICON.note}</span><h2>משימות מהפתקים <span class="muted num">${tasks.length}</span></h2></div>${notesListHtml(tasks)}</section>` : '') +
    `<section class="card" aria-labelledby="docH"><div class="card-h cat-rec"><span class="glyph">${ICON.doc}</span><h2 id="docH">המסמך הסופי</h2><span class="end meta">כך יישמר ב-Drive</span></div><div class="docprev" id="docPrev">${docPrevHtml(s)}</div></section>` +
    vizFoldHtml(viz);
}
const vizFoldHtml = (viz, open = false) => viz.length ? `<details class="card vizfold"${open ? ' open' : ''}><summary><span class="glyph">${ICON.clock}</span><h2>סיכום חזותי</h2><span class="muted num">${viz.length}</span>${ICON.chev}</summary><div class="grid">${viz.join('')}</div></details>` : '';
function refreshVizFold() { // the folded graphics follow the background updates and keep their open state
  const body = $('#tabBody'); if (!body || !session) return;
  const cur = $('.vizfold', body), html = vizFoldHtml(vizCards('all', true), !!cur?.open);
  if (cur) cur.outerHTML = html || ''; else if (html) body.insertAdjacentHTML('beforeend', html);
}
// the saved document's body, shown read-only in the app (same builder as the Drive copy)
function docPrevHtml(s) { const h = sessionDocHtml(s); return bdiHtml(h.slice(h.indexOf('<body dir="rtl">') + 16, h.lastIndexOf('</body>'))); }
// isolate the numbers in already-escaped HTML (text between tags only)
const bdiHtml = h => h.split(/(<[^>]+>)/).map(p => p.startsWith('<') ? p : p.replace(NUM_RE, (m, ent, num) => ent || `<bdi dir="ltr">${num}</bdi>`)).join('');
function refreshDocPrev() { const el = $('#docPrev'); if (el && session) el.innerHTML = docPrevHtml(session); }
function refreshTabLabels() {
  if (!session) return;
  const all = fieldsFor(session), filled = all.filter(f => session.fields[f.id]?.value).length;
  $$('[data-n="form"]').forEach(n => n.textContent = `${filled}/${all.length}`);
  $$('#trCount, #trCountPh').forEach(tc => tc.textContent = session.segments.length || '');
  const sc = $('#sideCount'); if (sc) sc.textContent = session.segments.length;
}

/* ---------------- the recording island: timer, stage, and the newest captured fact ---------------- */
function islandHtml() {
  return `<div class="island glass${recording ? ' rec' : ''}" id="island">
    <button class="isl-rec${recording ? ' on' : ''}" id="recBtn" data-act="rec" aria-label="${recording ? 'עצור הקלטה' : 'התחל הקלטה'}">${recording ? ICON.stop : ICON.mic}</button>
    <button class="isl-main" data-act="island" aria-haspopup="dialog" aria-label="נקלט עכשיו">
      <span class="isl-top"><span class="dot" aria-hidden="true"></span><b id="timer">00:00</b><span id="recState" aria-live="polite"></span></span>
      <span class="isl-cap idle" id="islCap"></span>
    </button>
    <span class="isl-badge" id="islBadge" hidden></span>
  </div>`;
}
let islT = null;
// compact island: "label: value" when both fit, the value alone when the label would push it out
function fitIsland() {
  const cap = $('#islCap'), isl = $('#island'); if (!cap || !isl || isl.classList.contains('expanded') || cap.classList.contains('idle')) return;
  cap.classList.add('withk');
  if (cap.scrollWidth > cap.clientWidth + 1) cap.classList.remove('withk');
}
window.addEventListener('resize', () => fitIsland());
const aiRecent = s => (s.recent || []).filter(r => s.fields[r.id]?.value && s.fields[r.id].source === 'ai');
function updateIsland(fresh = false) {
  const cap = $('#islCap'), badge = $('#islBadge'), isl = $('#island'); if (!cap || !session) return;
  const r = aiRecent(session)[0];
  if (r) { const v = session.fields[r.id], k = shortLabel(FIELD[r.id].label); cap.className = 'isl-cap'; cap.title = k; cap.innerHTML = `<span class="k">${esc(k)}: </span>${escN(v.value)}`; }
  else { cap.className = 'isl-cap idle'; cap.textContent = recording ? 'מקשיב… מה שייאמר יופיע כאן' : 'כשהמידע ייקלט מהשיחה, הוא יופיע כאן'; }
  const n = fieldsFor(session).filter(needsReview).length;
  badge.classList.toggle('err', !!lastStatus.err);
  badge.hidden = !n && !lastStatus.err; badge.innerHTML = lastStatus.err ? '!<span class="bl">המילוי נכשל</span>' : n ? `${n}<span class="bl">לאימות</span>` : '';
  if (fresh && isl) { // the island opens to show the whole fact, then settles back to compact
    isl.classList.remove('new'); void isl.offsetWidth; isl.classList.add('new', 'expanded');
    clearTimeout(islT); islT = setTimeout(() => { $('#island')?.classList.remove('expanded'); setTimeout(fitIsland, 560); }, 3800);
  }
  fitIsland();
}
const FEED_N = 6;
// the toolbar's overflow: display, transcript pane, the map and all settings, one tap away
function moreHtml() {
  return `<h3>עוד <button class="icon-btn x" data-act="popClose" aria-label="סגור">${ICON.close}</button></h3>
    <div class="more"><span class="lbl" id="mThL">מצב תצוגה</span><div class="seg" role="group" aria-labelledby="mThL">${THEMES.map(([id, label]) => `<button data-act="theme" data-theme="${id}" aria-pressed="${getTheme() === id}">${label}</button>`).join('')}</div>
    <div class="more-l">${MAP_URL ? `<a class="btn mapgo" href="${esc(mapLink(session.region))}" target="${MAP_TARGET}">${ICON.map} מפת הדרך לאזור <span class="ext" aria-label="(נפתח בלשונית המפה)">${ICON.ext}</span></a>` : ''}<button class="btn" data-act="focus">${ICON.focus} ${settings.focus ? 'יציאה ממצב פוקוס' : 'מצב פוקוס'}</button><button class="btn" data-act="settings">${ICON.gear} כל ההגדרות</button></div></div>`;
}
function feedHtml() {
  const s = session, rows = aiRecent(s).slice(0, FEED_N);
  const t = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  return `<h3>נקלט עכשיו <button class="icon-btn x" data-act="popClose" aria-label="סגור">${ICON.close}</button></h3>
    <div class="feed">${rows.length ? rows.map(r => {
      const f = FIELD[r.id], v = s.fields[r.id];
      return `<div class="feed-row"><div><div class="fl">${esc(shortLabel(f.label))} · ${t(r.at)} ${v.needsCheck ? '<span class="badge chk">לאמת</span>' : v.confirmed ? '<span class="badge ok">אומת</span>' : ''}${v.unverified ? '<span class="badge bad">לא נמצא בתמלול</span>' : ''}</div>
        <div class="fv">${escN(v.value)}</div>${r.prev ? `<div class="fw">היה: ${escN(String(r.prev.value).slice(0, 80))}</div>` : ''}</div>
        <div class="fa">${v.needsCheck ? `<button class="ok" data-act="confirm" data-fid="${r.id}">אשר</button>` : ''}${v.quote ? `<button data-act="src" data-fid="${r.id}">מקור</button>` : ''}<button data-act="edit" data-fid="${r.id}">ערוך</button><button data-act="undo" data-fid="${r.id}" aria-label="בטל את המילוי של ${esc(shortLabel(f.label))}">בטל</button></div></div>`;
    }).join('') : `<p class="empty-note">כשה-AI ימלא שדה מתוך השיחה, הוא יופיע כאן לאישור, לעריכה או לביטול.</p>`}</div>
    <div class="pop-foot"><span id="popStatus">${lastStatus.raw ? lastStatus.html : esc(lastStatus.html)}</span><button class="btn sm" data-act="fillNow">מלא עכשיו</button></div>`;
}

/* ---------------- popovers: the source of a fact, the island's feed ---------------- */
let popEl = null, popKey = '', popAnchor = null;
function closePop() {
  if (!popEl) return;
  popEl.remove(); popEl = null; popKey = ''; popAnchor = null;
  $$('.rec-s.on').forEach(e => e.classList.remove('on')); $$('.seg.sourced').forEach(e => e.classList.remove('sourced'));
  document.removeEventListener('pointerdown', popOutside, true);
}
function popOutside(e) { if (popEl && !popEl.contains(e.target) && !e.target.closest('[data-act="island"],[data-act="srcRec"],[data-act="src"],[data-act="verifyPart"],[data-act="more"],[data-act="region"]')) closePop(); }
function placePop() {
  if (!popEl || !popAnchor) return;
  const r = popAnchor.getBoundingClientRect(), w = popEl.offsetWidth, h = popEl.offsetHeight;
  let top = r.bottom + 10; if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 10);
  const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12);
  popEl.style.top = top + 'px'; popEl.style.left = left + 'px';
}
function openPop(anchor, html, key) {
  closePop();
  popEl = document.createElement('div'); popEl.className = 'pop glass'; popEl.setAttribute('role', 'dialog'); popEl.setAttribute('aria-label', key === 'feed' ? 'נקלט עכשיו' : 'מקור');
  popEl.innerHTML = html; document.body.appendChild(popEl); popKey = key; popAnchor = anchor; placePop();
  setTimeout(() => document.addEventListener('pointerdown', popOutside, true));
  popEl.querySelector('button:not(.x), a')?.focus({ preventScroll: true });
}
function refreshPop() {
  if (!popEl) return;
  if (popKey === 'feed') { popEl.innerHTML = feedHtml(); placePop(); }
  else if (popKey.startsWith('f:')) { popEl.innerHTML = srcPopHtml([popKey.slice(2)]); placePop(); }
  else if (popKey.startsWith('v:')) { const s = session, ids = CARD_SRC[popKey.slice(2)](s).filter(id => s.fields[id]?.value && (s.fields[id].needsCheck || s.fields[id].unverified)); if (ids.length) { popEl.innerHTML = srcPopHtml(ids, 'לאמת'); placePop(); } else closePop(); }
  else if (popKey.startsWith('r:')) { const r = insState().record[popKey.slice(2)]; if (r) { popEl.innerHTML = srcPopHtml(r.fields, FORM.find(x => x.id === popKey.slice(2))?.title); placePop(); } }
}
window.addEventListener('resize', placePop);
function findSeg(quote) {
  const q = normQ(quote); if (!q) return -1;
  const words = q.split(' ').filter(w => w.length > 1); let best = -1, score = 0;
  session.segments.forEach((g, i) => { const t = normQ(g.text); const sc = t.includes(q) ? 2 : words.filter(w => t.includes(w)).length / Math.max(1, words.length); if (sc > score) { score = sc; best = i; } });
  return score >= 0.6 ? best : -1;
}
// one or more fields: what each says, the words it was heard in, ▶ to hear them, and what to do about it
function srcPopHtml(ids, title) {
  const s = session, many = ids.length > 1;
  const blocks = ids.filter(id => FIELD[id]).map(id => {
    const v = s.fields[id] || {}, f = FIELD[id];
    const i = v.quote ? findSeg(v.quote) : -1, g = s.segments[i];
    const heard = v.quote && i >= 0 && !v.unverified;
    const canPlay = g && !g.manual && s.audioParts;
    const badge = v.unverified ? '<span class="badge bad">לא נמצא בתמלול</span>' : v.needsCheck ? '<span class="badge chk">לאמת</span>' : v.confirmed ? '<span class="badge ok">אומת</span>' : v.source === 'manual' ? '<span class="badge">נכתב ידנית</span>' : v.source === 'note' ? '<span class="badge">מפתק</span>' : '';
    return `<div style="margin-top:${many ? 12 : 0}px">${many ? `<div class="fl">${esc(shortLabel(f.label))} ${badge}</div>` : ''}<div class="fv">${escN(v.value || '—')}</div>
      ${v.quote ? `<div class="src-q${heard ? '' : ' bad'}"><div class="m">${!heard ? 'המודל ציטט, אבל זה לא נמצא בתמלול' : v.asked ? 'נשען על שאלה של המטפל, לא על דברי המטופל' : 'נשמע בתמלול'}${g ? ' · ' + hhmm(g.t) + (g.speaker != null ? ' · דובר ' + esc(g.speaker) : '') : ''}${canPlay ? `<button class="play" data-act="segPlay" data-i="${i}" aria-label="השמע מההקלטה">${ICON.play}</button>` : g ? ' · <span class="noaud">אין הקלטה לקטע זה</span>' : ''}</div>«${esc(v.quote)}»</div>` : ''}
      <div class="acts">${v.needsCheck || v.unverified ? `<button class="btn sm primary" data-act="confirm" data-fid="${id}">אשר</button>` : ''}<button class="btn sm" data-act="edit" data-fid="${id}">ערוך</button>${v.source === 'ai' ? `<button class="btn sm" data-act="undo" data-fid="${id}">בטל מילוי</button>` : ''}</div></div>`;
  });
  const one = ids.length === 1 && FIELD[ids[0]];
  const v1 = one ? s.fields[ids[0]] || {} : null;
  const b1 = one ? (v1.unverified ? '<span class="badge bad">לא נמצא בתמלול</span>' : v1.needsCheck ? '<span class="badge chk">לאמת</span>' : v1.confirmed ? '<span class="badge ok">אומת</span>' : '') : '';
  return `<h3>${esc(one ? shortLabel(FIELD[ids[0]].label) : title || 'מקורות')} ${b1}<button class="icon-btn x" data-act="popClose" aria-label="סגור">${ICON.close}</button></h3>${blocks.join('') || '<p class="empty-note">אין שדות מקור.</p>'}`;
}
function showSource(ids, anchor, key) {
  openPop(anchor, srcPopHtml(ids, key.startsWith('r:') ? FORM.find(x => x.id === key.slice(2))?.title : key.startsWith('v:') ? 'לאמת' : ''), key);
  // with the transcript beside the session, its line lights up too
  const side = $('#inspIn'); if (!side) return;
  const v = session.fields[ids[0]]; const i = v?.quote ? findSeg(v.quote) : -1;
  const seg = i >= 0 ? side.querySelector(`.seg[data-i="${i}"]`) : null;
  if (seg) { seg.classList.add('sourced'); seg.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
addEventListener('scroll', () => { if (popEl && popKey !== 'feed') placePop(); }, { passive: true });

/* ---------------- the live view ---------------- */
function liveHtml() {
  const sm = smart();
  return ptitleHtml() +
    (smartGraphics() ? `<div class="grid" id="vizGrid">${vizCards(session.stage, false).join('')}</div>` : '') +
    missingHtml() +
    (sm.record ? recordHtml() : '') +
    (sm.notes && (session.notes || []).length ? notesCardHtml() : '') +
    (sm.next ? nextHtml() : '');
}
// a session changed since it was last saved to Drive
function touch() { if (session) { session.changedAt = Date.now(); saveSession(); renderSaveState(); } }
function renderSaveState() {
  const el = $('#saveState'); if (!el || !session) return;
  const s = session, saved = s.savedAt ? new Date(s.savedAt).getTime() : 0;
  let cls = '', txt = 'נשמר במכשיר, עוד לא ב-Drive';
  if (saved && (s.changedAt || 0) <= saved) { cls = 'ok'; txt = 'נשמר ב-Drive · ' + hhmm(saved); }
  else if (saved) { cls = 'dirty'; txt = 'יש שינויים שלא נשמרו ב-Drive'; }
  el.className = 'savestate ' + cls; el.innerHTML = `<i aria-hidden="true"></i>${txt}`;
}
// errors in the therapist's words, with what to do next
function humanErr(e) {
  const m = String(e?.message || e || '');
  if (e?.name === 'TypeError' || /failed to fetch|networkerror|load failed|network/i.test(m)) return 'אין חיבור לשרת. בדוק את האינטרנט ונסה שוב.';
  if (/Drive 401|invalid_grant|נדרשת התחברות/.test(m)) return 'החיבור ל-Google פג. נסה שוב והתחבר מחדש.';
  if (/Drive 403/.test(m)) return 'ל-Google אין הרשאה לשמור בתיקייה. נסה שוב, או בדוק את ההתחברות בהגדרות.';
  if (/Drive 5\d\d/.test(m)) return 'Google Drive לא זמין כרגע. נסה שוב בעוד רגע.';
  return m;
}
function recPillHtml() {
  if (!recording || !session) return '';
  return `<button class="recpill" data-act="resume"><i aria-hidden="true"></i>מקליט · ${esc(session.patientName)} · <b id="pillTime">${fmtClock((session.recordedMs || 0) + (recSince ? Date.now() - recSince : 0))}</b><span>חזרה למפגש</span></button>`;
}
// how much an unanswered field matters in the "still not said" list: 1 must ask, 2 important, 3 useful (anything not listed)
const IMPORTANCE = {
  changes: 1, lead_sign: 1, adherence: 2, response: 2,                                   // follow-up
  chief_complaint: 1, location: 1, onset: 1, mechanism: 1, vas_max: 1, vas_now: 1,        // anamnesis
  night: 1, aggravating: 1, neuro_symptoms: 1, red_flags: 1, medications: 1,
  age: 2, occupation: 2, duration: 2, progression: 2, easing: 2, daily_pattern: 2, concordant: 2,
  swelling: 2, mechanical: 2, instability: 2, function_limits: 2, goals: 2,
  medical_history: 2, comorbidities: 2, physical_history: 2, imaging: 2, yellow_flags: 2,
  special_tests: 1, arom: 1, observation: 2, prom: 2, mmt: 2, neuro_exam: 2, palpation: 2, // exam
  therapist_impression: 1, treatment_given: 2, home_program: 2, plan_next: 2              // summary
};
const IMP_LABEL = { 1: 'חובה', 2: 'חשוב', 3: 'כדאי' };
const impOf = f => IMPORTANCE[f.id] || 3;
let missOpen = {}; // which of the lower levels (2 important, 3 useful) are open in "still not said"
// every unanswered field of the current stage, most important first (form order within a level)
function autoStage(s) {
  const has = id => stageFields(s, id).some(f => f.id !== 'name' && s.fields[f.id]?.value);
  return has('summary') ? 'summary' : has('exam') ? 'exam' : 'anamnesis';
}
function syncStage() {
  if (!session) return;
  const st = autoStage(session); if (st === session.stage) return;
  session.stage = st; openStages.add(st); saveSession(); renderRecState();
}
/* the session's region against what the session is actually about: the body map's pain zones, the words used
   for the location and the complaint, and the region of each special test on the map */
const ZONE_REGION = { head: 'צוואר וראש', neck: 'צוואר וראש', shoulder: 'כתף', upper_arm: 'כתף', elbow: 'מרפק', forearm: 'מרפק', wrist_hand: 'שורש כף יד וכף יד',
  low_back: 'גב תחתון', hip: 'ירך ואגן', thigh: 'ירך ואגן', knee: 'ברך', lower_leg: 'קרסול וכף רגל', ankle_foot: 'קרסול וכף רגל' };
const REGION_WORDS = {
  'צוואר וראש': /צוואר|עורף|cervical|neck|whiplash|כאבי ראש|סחרחור/i,
  'כתף': /כתף|כתפי|שכמה|rotator|shoulder|\bAC\b|SLAP|labr|סופרספינטוס|supraspinatus|infraspinatus|subacromial/i,
  'מרפק': /מרפק|אפיקונדיל|epicondyl|elbow|tennis|golfer/i,
  'שורש כף יד וכף יד': /שורש כף|פרק כף|כף היד|כף יד|אצבע|אגודל|wrist|carpal|thumb|quervain|קרוויין/i,
  'גב תחתון': /גב תחתון|מותני|לומב|lumbar|low back|\bLBP\b|סיאטיק|sciatic|sacr|עצה/i,
  'ירך ואגן': /ירך|אגן|מפשעה|\bhip\b|groin|pelvi|glute|ישבן|טרוכנטר|trochant/i,
  'ברך': /ברך|פיקה|פטל|knee|\bACL\b|\bPCL\b|\bMCL\b|\bLCL\b|מניסקוס|menisc|patell/i,
  'קרסול וכף רגל': /קרסול|כף רגל|כף הרגל|עקב|אכילס|ankle|foot|achilles|plantar/i
};
function regionScores(s) {
  const sc = {}, add = (r, n) => { if (r) sc[r] = (sc[r] || 0) + n; };
  const text = ['location', 'chief_complaint'].map(id => s.fields[id]?.value || '').join(' ');
  for (const [r, re] of Object.entries(REGION_WORDS)) if (re.test(text)) add(r, 2);
  new Set((s.ins?.body || []).filter(b => b.kind === 'pain').map(b => ZONE_REGION[b.zone])).forEach(r => add(r, 2));
  const d = siteData;
  if (d) for (const t of s.ins?.exam?.tests || []) {
    if (!t.test_id) continue;
    const reg = d.REGIONS.find(x => JSON.stringify(x).includes('"' + t.test_id + '"'));
    add(Object.keys(MAP_TAB).find(k => MAP_TAB[k] === reg?.id), 1);
  }
  return sc;
}
// the region the content points to, when it is clearly not the one the session was opened with
function regionMismatch(s = session) {
  if (!s) return null;
  const sc = regionScores(s), best = Object.keys(sc).sort((a, b) => sc[b] - sc[a])[0];
  if (!best || best === s.region || s.regionKeep === best) return null;
  return sc[best] >= 3 && (sc[s.region] || 0) * 2 < sc[best] ? best : null;
}
function regionBanner() {
  const m = regionMismatch(); if (!m) return '';
  return `<div class="banner warn rgw" role="alert"><span>התוכן של המפגש נראה על <b>${esc(m)}</b>, אבל האזור שהוגדר הוא <b>${esc(session.region)}</b>. הניתוח, ההשערות ומפת הדרך משתמשים באזור שהוגדר.</span>
    <span class="rgw-a"><button class="btn sm primary" data-act="setRegion" data-r="${esc(m)}">שנה אזור ל${esc(m)}</button><button class="btn sm" data-act="keepRegion" data-r="${esc(m)}">השאר ${esc(session.region)}</button></span></div>`;
}
function setRegion(r) {
  if (!session || !REGIONS.includes(r) || r === session.region) return;
  session.region = r; session.regionKeep = '';
  upsertPatient({ name: session.patientName, region: r });
  markDirty(['location']); touch(); closePop();
  if (aiReady() && smartAny()) runInsight();
  if (view === 'finish') renderFinish(); else renderSession();
  toast('אזור המפגש: ' + r, false, 1800);
}
function regionPopHtml() {
  return `<h3>אזור המפגש <button class="icon-btn x" data-act="popClose" aria-label="סגור">${ICON.close}</button></h3>
    <p class="muted small" style="margin-bottom:6px">קובע את בסיס הידע לניתוח, את ההשערות ואת מפת הדרך.</p>
    <div class="mlist one">${REGIONS.map(r => `<button class="mrow" data-act="setRegion" data-r="${esc(r)}"${r === session.region ? ' aria-current="true"' : ''}><span>${esc(r)}</span>${r === session.region ? ICON.check : ''}</button>`).join('')}</div>`;
}

/* ---------------- an in-app dialog in place of the browser's confirm() ---------------- */
function ask({ title, text = '', buttons }) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const wrap = document.createElement('div'); wrap.className = 'dlg-wrap';
    wrap.innerHTML = `<div class="dlg glass" role="alertdialog" aria-modal="true" aria-labelledby="dlgT" aria-describedby="dlgX">
      <h2 id="dlgT">${esc(title)}</h2>${text ? `<p id="dlgX">${esc(text)}</p>` : ''}
      <div class="dlg-b">${buttons.map((b, i) => `<button class="btn block${b.primary ? ' primary' : ''}${b.danger ? ' danger' : ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
    document.body.appendChild(wrap);
    const done = v => { wrap.remove(); document.removeEventListener('keydown', onKey, true); prev?.focus?.({ preventScroll: true }); resolve(v); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(null); } };
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) done(buttons[+b.dataset.i].value); else if (e.target === wrap) done(null); });
    wrap.querySelector('.btn.primary, .btn')?.focus();
  });
}
const confirmDlg = async (title, text, ok, danger = false) => (await ask({ title, text, buttons: [{ label: ok, value: true, primary: !danger, danger }, { label: 'ביטול', value: false }] })) === true;

// still not said: the current phase's fields, and any must-ask from an earlier phase that was skipped
function missingFields(s) {
  const cur = STAGES.findIndex(x => x.id === s.stage), out = [];
  STAGES.forEach((st, si) => {
    if (si > cur) return;
    stageFields(s, st.id).forEach((f, i) => { if (s.fields[f.id]?.value) return; const imp = impOf(f); if (si < cur && imp !== 1) return; out.push({ f, i: si * 100 + i, imp }); });
  });
  return out.sort((a, b) => a.imp - b.imp || a.i - b.i);
}
const missRow = ({ f, imp }) => `<button class="mrow" data-act="jump" data-fid="${f.id}"><i class="d${imp}" aria-hidden="true"></i><span>${esc(shortLabel(f.label))}</span>${ICON.chev}</button>`;
function missingHtml() {
  const m = missingFields(session), st = stageLabel(session.stage);
  if (!m.length) return `<div class="banner info" id="missing">כל השדות בשלב ${esc(st)} מולאו</div>`;
  const lv = k => m.filter(x => x.imp === k);
  const disc = k => lv(k).length ? `<button class="mrow disc" data-act="missLevel" data-k="${k}" aria-expanded="${!!missOpen[k]}"><i class="d${k}" aria-hidden="true"></i><span>${IMP_LABEL[k]}</span><span class="cnt">${lv(k).length}</span>${ICON.chev}</button>${missOpen[k] ? lv(k).map(missRow).join('') : ''}` : '';
  return `<section class="card missing" id="missing" aria-labelledby="missH">
    <div class="card-h cat-gap"><span class="glyph">${ICON.alert}</span><h2 id="missH">עוד לא נאמר · ${esc(st)} <span class="muted num">${m.length}</span></h2></div>
    <div class="mlist">${lv(1).map(missRow).join('')}${disc(2)}${disc(3)}</div></section>`;
}

/* ---------------- the form, as review ---------------- */
function fieldHtml(f) {
  const v = session.fields[f.id] || {};
  const badges = [
    v.value && v.locked ? '<span class="badge">נערך ידנית</span>' : '',
    v.value && v.source === 'ai' && !v.locked && !v.needsCheck && !v.unverified ? (v.confirmed ? '<span class="badge ok">אומת</span>' : '<span class="badge">מולא אוטומטית</span>') : '',
    v.value && v.needsCheck && !v.unverified ? '<span class="badge chk">לאמת</span>' : '',
    v.value && v.unverified ? '<span class="badge bad" title="המודל ציטט מילים שלא נמצאו בתמלול">לא נמצא בתמלול</span>' : ''
  ].join('');
  return `<div class="field${v.value ? '' : ' empty'}" id="f-${f.id}">
    <label for="t-${f.id}">${esc(f.label)} ${badges}</label>
    <textarea id="t-${f.id}" data-fid="${f.id}" rows="1" placeholder="—">${esc(v.value || '')}</textarea>
    ${v.value && (v.quote || v.needsCheck || v.locked) ? `<div class="fmeta">
      ${v.quote ? `<button data-act="src" data-fid="${f.id}">מקור</button>` : ''}
      ${v.needsCheck ? `<button data-act="confirm" data-fid="${f.id}">סמן כמאומת</button>` : ''}
      ${v.locked ? `<button data-act="unlock" data-fid="${f.id}">אפשר מילוי אוטומטי</button>` : ''}
    </div>` : ''}
  </div>`;
}
// one group per stage, the current stage open, empty fields as one-line rows
let openStages = new Set([session?.stage || 'anamnesis']);
function formHtml() {
  const s = session, secs = sectionsFor(s);
  return STAGES.map(st => {
    const mine = secs.filter(sec => st.sections.includes(sec.id)); if (!mine.length) return '';
    const all = mine.flatMap(sec => sec.fields), n = all.filter(f => s.fields[f.id]?.value).length;
    return `<details class="stg" id="stg-${st.id}" data-stage="${st.id}" ${openStages.has(st.id) ? 'open' : ''}>
      <summary><h2>${st.label}</h2><span class="cnt" id="scnt-${st.id}">${n}/${all.length}</span><span class="chev" aria-hidden="true">${ICON.chev}</span></summary>
      ${mine.map(sec => {
        const k = sec.fields.filter(f => s.fields[f.id]?.value).length;
        return `<section class="sec" id="sec-${sec.id}"><h3>${esc(sec.title)} <span class="cnt" id="cnt-${sec.id}">${k}/${sec.fields.length}</span></h3><div class="fields">${sec.fields.map(fieldHtml).join('')}</div></section>`;
      }).join('')}
    </details>`;
  }).join('');
}
const stageOfField = id => { const sec = sectionsFor(session).find(x => x.fields.some(f => f.id === id)); return STAGES.find(st => st.sections.includes(sec?.id))?.id; };
// a missing token or a captured fact: show the field without raising the keyboard; editing is a tap on the field itself
function jumpTo(id, edit = false) {
  closePop();
  if (tab !== 'form') { const st = stageOfField(id); if (st) openStages.add(st); tab = 'form'; renderTab(); }
  const g = $('#stg-' + stageOfField(id)); if (g && !g.open) g.open = true;
  const el = $('#f-' + id); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  if (edit) setTimeout(() => $('#t-' + id)?.focus({ preventScroll: true }), 350);
}
function refreshField(id, flash = false) {
  if (tab !== 'form' && tab !== 'summary') return;
  const el = $('#f-' + id); if (!el) return;
  const ta = $('#t-' + id);
  if (ta && document.activeElement === ta) return;
  const tmp = document.createElement('div'); tmp.innerHTML = fieldHtml(FIELD[id]);
  const fresh = tmp.firstElementChild; el.replaceWith(fresh);
  autosize($('#t-' + id));
  if (flash) { fresh.classList.add('flash'); setTimeout(() => fresh.classList.remove('flash'), 1400); }
}
function refreshMissing() { refreshLive(); }
// the live view is cheap to rebuild; keep the reader's scroll position and anything being typed
function refreshLive() {
  updateIsland(); refreshPop();
  if (view === 'finish') return;
  if (tab === 'summary') { refreshDocPrev(); refreshVizFold(); return; }
  if (tab !== 'live' || !$('#tabBody')) return;
  const y = window.scrollY; $('#tabBody').innerHTML = liveHtml(); renderSaveState(); window.scrollTo(0, y);
}
function refreshCounts() {
  refreshTabLabels();
  for (const st of STAGES) {
    const all = stageFields(session, st.id), n = `${all.filter(f => session.fields[f.id]?.value).length}/${all.length}`;
    const c = $('#scnt-' + st.id); if (c) c.textContent = n;
  }
  if (tab !== 'form') return;
  for (const sec of sectionsFor(session)) {
    const c = $('#cnt-' + sec.id); if (c) c.textContent = `${sec.fields.filter(f => session.fields[f.id]?.value).length}/${sec.fields.length}`;
  }
}

/* ---------------- transcript, as a conversation ---------------- */
function segHtml(g, i, prevStage) {
  const mark = g.stage !== prevStage ? `<div class="stage-mark">${esc(stageLabel(g.stage))}</div>` : '';
  const play = !g.manual && session?.audioParts ? `<button class="seg-play" data-act="segPlay" data-i="${i}" aria-label="השמע את השורה מההקלטה" title="השמע מההקלטה">${ICON.play}</button>` : '';
  const sp = g.speaker != null ? (+g.speaker - 1) % 2 + 1 : 0;
  return `${mark}<div class="seg s${sp}${g.manual ? ' manual' : ''}${PL.seg === i && PL.audio ? ' playing' : ''}" data-i="${i}">${esc(g.text)}<div class="sm">${g.speaker != null ? `<span class="spk">דובר ${esc(g.speaker)}</span>·` : ''}<span>${hhmm(g.t)}</span>${g.manual ? '<span>· הוקלד</span>' : ''}${play}</div></div>`;
}
function transcriptHtml(inSide) {
  const s = session; let prev = null;
  const segs = s.segments.map((g, i) => { const h = segHtml(g, i, prev); prev = g.stage; return h; }).join('');
  return `<div id="segList">${segs || '<p class="empty-note" id="noSegs">עוד אין תמלול. לחץ על המיקרופון כדי להתחיל, או הקלד והדבק טקסט למטה.</p>'}</div>
    <div class="interim" id="interim"></div>
    <div class="tr-tools">
      <div><label class="lbl" for="manualText">הוספה ידנית: הקלדה, הכתבה במקלדת, או הדבקת תמלול</label>
      <textarea id="manualText" class="inp" placeholder="למשל: Lachman ימין חיובי, end feel רך"></textarea>
      <button class="btn block" style="margin-top:8px" data-act="addManual">הוסף לתמלול</button></div>
      <div id="audioBox"></div>
      <p class="muted small">ממתין למילוי: <span id="pend">${pendingChars()}</span> תווים · עלות המפגש (הערכה): $${(s.cost || 0).toFixed(3)} · מנוע: ${useSoniox() ? 'Soniox' : 'הדפדפן'}</p>
      <button class="linkbtn small" style="justify-self:start" data-act="copyLog">העתק לוג זיהוי דיבור (לאבחון תקלות)</button>
    </div>`;
}
function appendSegmentUI(g, i) {
  const list = $('#segList'); if (!list) return;
  $('#noSegs')?.remove();
  const prev = i > 0 ? session.segments[i - 1].stage : null;
  list.insertAdjacentHTML('beforeend', segHtml(g, i, prev));
  const p = $('#pend'); if (p) p.textContent = pendingChars();
  const box = $('#inspIn');
  if (box) { if (list.offsetTop + list.offsetHeight - box.scrollTop - box.clientHeight < 220) sideToLatest(); }
  else if (recording) list.lastElementChild?.scrollIntoView({ block: 'nearest' });
  refreshTabLabels();
}
function renderInterim() { const el = $('#interim'); if (el) el.textContent = interim ? interim + '…' : ''; }
function analysisHtml() {
  const s = session;
  return `<section class="card"><div class="card-h cat-hyp"><span class="glyph">${ICON.analysis}</span><h2>ניתוח קליני</h2></div>
    <p class="muted small" style="margin:0 0 12px">הניתוח נשען על הטופס, התמלול ובסיס הידע שלך לאזור "${esc(s.region)}": ${settings.siteKB ? 'מפת הדרך + ' : ''}${parseKbDocs().filter(d => d.id && regionMatch(d.regions, s.region)).length} סיכומים מ-Drive. זו טיוטה לשיקול דעת: הבחנה, לא אבחנה.</p>
    <button class="btn primary block" id="analysisBtn" data-act="analyze">${s.analysis ? 'הפק ניתוח מחדש' : 'הפק ניתוח'}</button>
    <div class="muted small" id="analysisStatus" style="margin-top:8px">${s.analysisAt ? 'נוצר ' + hhmm(s.analysisAt) : ''}</div>
    <div class="hl-legend" style="margin-top:12px">${Object.keys(HL_LABEL).map(k => `<mark class="hl hl-${k}">${HL_LABEL[k]}</mark>`).join('')}</div>
    <div class="analysis" id="analysisOut" style="margin-top:8px">${s.analysis ? md(s.analysis) : ''}</div></section>
  ${smart().hypo && insState().hypo.length ? hypoCard(false) : ''}
  <div id="testLinks"></div>
  <button class="btn block" data-act="download">הורד עותק של המפגש (HTML)</button>`;
}
function renderRecState() {
  syncTicker();
  const b = $('#recBtn'); if (!b) return;
  b.classList.toggle('on', recording);
  b.innerHTML = recording ? ICON.stop : ICON.mic;
  b.setAttribute('aria-label', recording ? 'עצור הקלטה' : 'התחל הקלטה');
  $('#island')?.classList.toggle('rec', recording);
  const st = $('#recState');
  if (st) st.textContent = recording ? 'מקליט · ' + stageLabel(session.stage) : (useSoniox() || SR ? stageLabel(session.stage) : 'זיהוי דיבור לא נתמך');
  updateIsland();
}
function renderSaveBtn() { renderSaveState(); }
let lastStatus = { html: '', err: false, raw: false };
function setFillStatus(text, err = false, raw = false) {
  lastStatus = { html: text, err, raw };
  const el = $('#fillStatus');
  if (el) { if (raw) el.innerHTML = text; else el.textContent = text; }
  updateIsland();
  const p = $('#popStatus'); if (p) { if (raw) p.innerHTML = text; else p.textContent = text; }
}
function tickTimer() {
  if (!session) return;
  const ms = (session.recordedMs || 0) + (recording && recSince ? Date.now() - recSince : 0);
  const el = $('#timer'); if (el) el.textContent = fmtClock(ms);
  const p = $('#pillTime'); if (p) p.textContent = fmtClock(ms);
}
let recTicker = null;
function syncTicker() { // the clock and the recognizer watchdog tick every second only while recording
  if (recording && !recTicker) recTicker = setInterval(() => {
    tickTimer(); if (view === 'session') maybeFill();
    if (recording && !useSoniox() && !IS_ANDROID && rec && Date.now() - lastRecEvent > WATCHDOG_MS) restartRec('watchdog');
    if (recording && useSoniox() && STT.buf.trim() && Date.now() - STT.lastFinal > 2500) sttFlush();
  }, 1000);
  if (!recording && recTicker) { clearInterval(recTicker); recTicker = null; tickTimer(); }
}
setInterval(() => { if (!recording && view === 'session') maybeFill(); }, 10000); // typed transcript lines still get filled

/* ---------------- live record (Notes-like) ---------------- */
function recordHtml() {
  const s = session, ins = insState(), dirty = s.insDirty?.secs || [];
  const secs = sectionsFor(s).filter(sec => sec.fields.some(f => f.id !== 'name' && s.fields[f.id]?.value));
  const flag = ids => ids.some(id => s.fields[id]?.unverified) ? '<span class="badge bad">לא נמצא בתמלול</span>' : ids.some(id => s.fields[id]?.needsCheck) ? '<span class="badge chk">לאמת</span>' : '';
  const body = secs.map(sec => {
    const r = ins.record[sec.id], filled = sec.fields.filter(f => f.id !== 'name' && s.fields[f.id]?.value);
    if (r && r.text) {
      const ids = (r.fields || []).filter(id => FIELD[id]);
      return `<div class="rec-sec"><h3>${esc(sec.title)}</h3><p class="rec-p"><button class="rec-s${dirty.includes(sec.id) ? ' draft' : ''}" data-act="srcRec" data-sec="${sec.id}">${escN(r.text)}</button>${flag(ids)}</p></div>`;
    }
    return `<div class="rec-sec"><h3>${esc(sec.title)}</h3><div class="rec-raw">${filled.map(f => `<button class="rec-s" data-act="src" data-fid="${f.id}"><span class="k">${esc(shortLabel(f.label))}:</span> ${esc(s.fields[f.id].value)} ${flag([f.id])}</button>`).join('')}</div></div>`;
  }).join('');
  const at = ins.at.record ? 'עודכן ' + hhmm(ins.at.record) : '';
  return `<section class="card" aria-labelledby="recH"><div class="card-h cat-rec"><span class="glyph">${ICON.doc}</span><h2 id="recH">רשומה</h2>
    <span class="end"><span class="meta">${insighting ? '<span class="spin"></span> מתעדכן' : dirty.length && at ? 'יתעדכן במילוי הבא' : at}</span>${aiReady() ? `<button class="icon-btn" data-act="insight" aria-label="רענן את הרשומה והגרפיקה" title="רענן">${ICON.refresh}</button>` : ''}</span></div>
    ${body ? `<div class="record">${body}</div><p class="fine">לחיצה על משפט מראה מאיפה הוא הגיע ומשמיעה אותו מההקלטה.</p>` : `<p class="empty-note">הרשומה תיכתב כאן תוך כדי המפגש, ממה שנקלט מהשיחה.</p>`}</section>`;
}

/* ---------------- notes ---------------- */
function notesListHtml(list) {
  return `<ul class="notes">${list.map(n => `<li class="${n.done ? 'done' : ''}"><p>${esc(n.text)}</p>
    <span>${n.task ? `<button class="tick" data-act="taskDone" data-nid="${n.id}" aria-pressed="${!!n.done}" aria-label="בוצע: ${esc(n.task)}">${ICON.check}</button>` : `<button class="icon-btn" data-act="noteDel" data-nid="${n.id}" aria-label="מחק פתק">${ICON.trash}</button>`}</span>
    <div class="to">${n.status === 'pending' ? '<span class="spin"></span> ממתין לשיוך' : ''}${n.field && FIELD[n.field] ? `נוסף לשדה <b>${esc(shortLabel(FIELD[n.field].label))}</b> <button class="linkbtn" data-act="noteUnfile" data-nid="${n.id}">בטל</button>` : ''}${n.task ? `${n.field ? ' · ' : ''}משימה: <b>${esc(n.task)}</b>` : ''}${n.status === 'kept' ? 'נשמר כפתק' : ''}</div></li>`).join('')}</ul>`;
}
function notesCardHtml() {
  const list = [...(session.notes || [])].reverse();
  return `<section class="card cat-note" aria-labelledby="noteH"><div class="card-h"><span class="glyph">${ICON.note}</span><h2 id="noteH">פתקים <span class="muted num">${list.length}</span></h2><span class="end meta">ה-AI משייך כל פתק לשדה או למשימה</span></div>${notesListHtml(list)}</section>`;
}
// phones fold the note bar into its button (the screen is short); wider screens keep it open
const PHONE_MQ = matchMedia('(max-width: 759px)');
let noteFold = PHONE_MQ.matches;
PHONE_MQ.addEventListener?.('change', e => { noteFold = e.matches; if (view === 'session' && session) renderTab(); });
function setNoteFold(fold) {
  const f = $('#noteBar .notebar'); if (!f) return;
  noteFold = fold && PHONE_MQ.matches; f.classList.toggle('folded', noteFold);
  f.querySelector('.gl')?.setAttribute('aria-expanded', String(!noteFold));
  if (!noteFold) $('#noteIn')?.focus();
}
function addNote() {
  const inp = $('#noteIn'); const text = (inp?.value || '').trim(); if (!text || !session) return;
  session.notes = session.notes || [];
  session.notes.push({ id: Date.now().toString(36), text, at: Date.now(), status: aiReady() ? 'pending' : 'kept' });
  inp.value = ''; touch(); refreshLive();
  if (aiReady()) runInsight(); else toast('הפתק נשמר. שיוך אוטומטי דורש קוד גישה בהגדרות.', false, 3000);
}

/* ---------------- next steps (BETA) ---------------- */
function nextHtml() {
  const list = insState().next || [];
  return `<section class="card ai" aria-labelledby="nextH"><div class="card-h cat-hyp"><span class="glyph">${ICON.sparkles}</span><h2 id="nextH">הצעות להמשך</h2><span class="badge beta">BETA</span><span class="end meta">${insState().at.next ? 'עודכן ' + hhmm(insState().at.next) : ''}</span></div>
    ${list.length ? `<ul class="nexts">${list.map(x => `<li><span class="ic" aria-hidden="true">${x.kind === 'test' ? ICON.tests : ICON.question}</span><p>${esc(x.text)}<span>${esc(x.why || '')}</span></p>${x.test_id && testLink(x.test_id) ? `<a class="chipl" href="${testLink(x.test_id)}" target="${MAP_TARGET}">כרטיס במפה</a>` : '<span></span>'}</li>`).join('')}</ul>`
      : `<p class="empty-note">אחרי כמה פרטים מהשיחה יופיעו כאן השאלה או המבדק הבאים שכדאי לשקול.</p>`}
    <p class="fine">הצעות של ה-AI לפי מה שנאמר ומפת הדרך. ההחלטה שלך.</p></section>`;
}

/* ---------------- settings: a drawer with tabs ---------------- */
let drTab = 'display';
const DR_TABS = [
  ['display', 'תצוגה', 'textformat', 'var(--tint)'], ['smart', 'כלים חכמים', 'sparkles', 'var(--indigo)'],
  ['stt', 'תמלול', 'live', 'var(--red)'], ['api', 'API', 'key', 'var(--green)'],
  ['kb', 'בסיס ידע', 'book', 'var(--orange)'], ['data', 'נתונים', 'tray', '#8e8e93']
];
const sw = (key, on, label, sub = '') => `<label class="gi"><span class="t">${label}${sub ? `<small>${sub}</small>` : ''}</span><input type="checkbox" class="switch" role="switch" data-set="${key}" ${on ? 'checked' : ''}></label>`;
function drBody(t) {
  const st = settings, sm = smart();
  const modelOpts = cur => ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1'].map(m => `<option ${m === cur ? 'selected' : ''}>${m}</option>`).join('');
  if (t === 'display') return `
    <div class="group"><h3>צבעים</h3><div class="gl"><div class="gi stack"><div class="seg" role="group" aria-label="מצב תצוגה">${THEMES.map(([id, label]) => `<button data-act="theme" data-theme="${id}" aria-pressed="${getTheme() === id}">${label}</button>`).join('')}</div></div></div>
      <p class="gf">"אוטומטי": נוח לעין, וכהה כשהמכשיר במצב כהה. הבחירה חלה גם על המפה. "נוח לעין": גוון חם וסינוור נמוך, לעבודה ארוכה.</p></div>
    <div class="group"><h3>פריסה</h3><div class="gl">
      <div class="gi stack"><span class="lbl" id="swL">חלונית התמלול (במסך רחב)</span><div class="seg" role="group" aria-labelledby="swL">${['hidden', 'narrow', 'medium', 'wide'].map(k => `<button data-act="sideW" data-v="${k}" aria-pressed="${(st.sideW || 'medium') === k}">${SIDE_LABEL[k]}</button>`).join('')}</div></div>
      <div class="gi stack"><span class="lbl" id="dnL">צפיפות</span><div class="seg" role="group" aria-labelledby="dnL">${[['comfortable', 'רגילה'], ['compact', 'קומפקטית']].map(([k, l]) => `<button data-act="density" data-v="${k}" aria-pressed="${(st.density || 'comfortable') === k}">${l}</button>`).join('')}</div></div>
      ${sw('focus', st.focus, 'מצב פוקוס', 'במפגש: בלי סרגל הצד, חלונית התמלול וכלים משניים')}
    </div></div>`;
  if (t === 'smart') return `
    <div class="group"><h3>רשומה ופתקים</h3><div class="gl">
      ${sw('smart.record', sm.record, 'רשומה חיה', 'ה-AI כותב את הרשומה הקלינית תוך כדי המפגש, כל משפט עם מקור')}
      ${sw('smart.notes', sm.notes, 'פתקים חכמים', 'פתק שתכתוב משויך לשדה בטופס או הופך למשימה לסוף המפגש')}
    </div></div>
    <div class="group"><h3>גרפיקה קלינית</h3><div class="gl">
      ${sw('smart.timeline', sm.timeline, 'מהלך הפציעה', 'ציר זמן מההתחלה ועד היום, ועוצמת הכאב')}
      ${sw('smart.body', sm.body, 'מפת גוף', 'מיקום הכאב, ההקרנה והנימול, מלפנים ומאחור')}
      ${sw('smart.exam', sm.exam, 'ממצאי בדיקה', 'טווחי תנועה וכוח מול הצד השני, ותוצאות המבדקים')}
      ${sw('smart.hypo', sm.hypo, 'לוח השערות', 'השערות עבודה מתוך מפת הדרך, עם מה שתומך ומה שסותר')}
    </div><p class="gf">הגרפיקה מופיעה במפגש לפי השלב, ובסיכום החזותי בסוף המפגש. כל כלי שמופעל מוסיף קריאה קצרה ל-API אחרי כל מילוי.</p></div>
    <div class="group"><h3>ניסיוני</h3><div class="gl">
      <label class="gi"><span class="t">הצעות להמשך <span class="badge beta">BETA</span><small>השאלה או המבדק הבאים שכדאי לשקול, עם קישור לכרטיס במפה</small></span><input type="checkbox" class="switch" role="switch" data-set="smart.next" ${sm.next ? 'checked' : ''}></label>
    </div></div>`;
  if (t === 'stt') return `
    <div class="group"><h3>מנוע תמלול</h3><div class="gl"><div class="gi stack">
      <select id="sEngine" class="inp" data-set="engine" aria-label="מנוע תמלול">
        <option value="browser" ${st.engine !== 'soniox' ? 'selected' : ''}>זיהוי הדיבור של הדפדפן (חינם)</option>
        <option value="soniox" ${st.engine === 'soniox' ? 'selected' : ''}>Soniox: רציף, מדויק יותר, מזהה דוברים (≈$0.12 לשעה)</option></select></div>
      ${sw('continuous', st.continuous, 'זיהוי רציף בדפדפן', 'כבה אם מופיעות כפילויות בתמלול')}
      ${sw('saveAudio', st.saveAudio, 'שמירת ההקלטה', 'במכשיר עד סגירת המפגש, וב-Drive יחד עם המפגש')}
    </div><p class="gf">את קוד הגישה ל-Soniox ובדיקת החיבור תמצא בלשונית API.</p></div>
    <div class="group"><h3>מילוי הטופס</h3><div class="gl">
      ${sw('autoFill', st.autoFill, 'מילוי אוטומטי תוך כדי הקלטה')}
      <div class="gi"><label class="t" for="sChars">למלא אחרי כמה תווים חדשים</label><input id="sChars" class="inp num" style="width:110px" type="number" min="80" step="20" data-set="fillChars" data-norm="chars" value="${esc(st.fillChars)}"></div>
    </div></div>`;
  if (t === 'api') return `
    <div class="group"><h3>גישה לשרת</h3><div class="gl">
      <div class="gi stack"><label class="lbl" for="sAccess">קוד גישה (APP_ACCESS_CODE בשרת ב-Cloudflare)</label><input id="sAccess" class="inp ltr" type="password" autocomplete="off" data-set="accessCode" data-norm="trim" value="${esc(st.accessCode)}"></div>
    </div><p class="gf">אותו קוד פותח את ה-AI ואת Soniox. מפתחות החשבון נשמרים רק בשרת, לא במכשיר.</p></div>
    <div class="group"><h3>Claude</h3><div class="gl">
      <div class="gi stack"><label class="lbl" for="sExt">מודל למילוי ולכלים החכמים</label><select id="sExt" class="inp ltr" data-set="extractModel">${modelOpts(st.extractModel)}</select>
        <label class="lbl" for="sAna">מודל לניתוח</label><select id="sAna" class="inp ltr" data-set="analysisModel">${modelOpts(st.analysisModel)}</select></div>
      <div class="gi"><span class="t">בדיקת חיבור<small>קוד הגישה, השרת והמפתח שבו</small></span><button class="btn sm" data-act="testKey">בדוק חיבור ל-Claude</button></div>
    </div></div>
    <div class="group"><h3>Soniox</h3><div class="gl">
      <div class="gi"><span class="t">בדיקת חיבור<small>המכשיר מקבל מפתח זמני לכל חיבור</small></span><button class="btn sm" data-act="testSoniox">בדוק חיבור ל-Soniox</button></div>
    </div></div>
    <div class="group"><h3>Google Drive</h3><div class="gl">
      <div class="gi stack"><label class="lbl" for="sCid">OAuth Client ID</label><input id="sCid" class="inp ltr" autocomplete="off" placeholder="…apps.googleusercontent.com" data-set="clientId" data-norm="trim" value="${esc(st.clientId)}">
        <label class="lbl" for="sRoot">שם תיקיית המטופלים</label><input id="sRoot" class="inp" data-set="rootFolderName" data-norm="root" value="${esc(st.rootFolderName)}"></div>
      <div class="gi"><span class="t">התחברות<small>יוצר את תיקיית המטופלים אם אינה קיימת</small></span><button class="btn sm" data-act="testDrive">התחבר ובדוק</button></div>
    </div></div>`;
  if (t === 'kb') return `
    <div class="group"><h3>מקורות</h3><div class="gl">
      ${sw('siteKB', st.siteKB, 'מפת הדרך', 'מסגרת כללית לכל אזור, ופרק מלא לצוואר, כתף, מרפק ושורש כף יד')}
      <div class="gi stack"><label class="lbl" for="sKb">סיכומים ב-Drive: קישור בכל שורה (Google Docs, ‏docx, ‏PDF). <span class="ltr">קישור | אזורים | חלקים</span>. בלי אזורים: לכל ניתוח. שורה שמתחילה ב-# היא הערה.</label>
        <textarea id="sKb" class="inp ltr" style="min-height:150px;font-size:12px" data-set="kbDocs">${esc(st.kbDocs)}</textarea>
        <button class="btn sm" style="margin-top:8px" data-act="kbDefault">החזר לרשימה המוכנה</button></div>
      <div class="gi"><label class="t" for="sBudget">תקרת בסיס ידע לניתוח אחד (אלפי תווים)</label><input id="sBudget" class="inp num" style="width:110px" type="number" min="20" step="10" data-set="kbBudget" data-norm="budget" value="${esc(st.kbBudget)}"></div>
      <div class="gi stack"><label class="lbl" for="sExtra">ידע נוסף (טקסט חופשי, אופציונלי)</label><textarea id="sExtra" class="inp" data-set="extraKB">${esc(st.extraKB)}</textarea></div>
      <div class="gi"><span class="t">בדיקה<small>קורא שוב את כל המקורות ומראה היקף ועלות לכל אזור</small></span><button class="btn sm" data-act="refreshKb">רענן ובדוק</button></div>
    </div><div class="small" id="kbStatus" style="padding:8px 14px 0"></div></div>`;
  return `
    <div class="group"><h3>הצפנה</h3><div class="gl">
      <label class="gi"><span class="t">הצפן את הנתונים במכשיר עם חשבון Google<small>המפגש, רשימת המטופלים וההקלטות נשמרים מוצפנים. כל פתיחה של האפליקציה מבקשת התחברות ל-Google.</small></span><input type="checkbox" class="switch" role="switch" data-act="encToggle" ${st.encrypt ? 'checked' : ''} ${st.clientId ? '' : 'disabled'}></label>
    </div><p class="gf">${st.clientId ? 'המפתח נשמר בתיקייה נסתרת של האפליקציה ב-Drive שלך ולא במכשיר.' : 'כדי להפעיל צריך Google Client ID בלשונית API.'}</p></div>
    <div class="group"><h3>שימוש</h3><div class="gl"><div class="gi"><span class="t">עלות API מצטברת (הערכה)</span><b class="num">$${(usage.total || 0).toFixed(2)}</b></div></div></div>
    <div class="group"><h3>מחיקה</h3><div class="gl"><div class="gi"><span class="t">מחק את כל הנתונים המקומיים<small>מפתחות, רשימת מטופלים ומפגש פתוח. קבצים ב-Drive לא נמחקים.</small></span><button class="btn sm danger" data-act="wipe">מחק</button></div></div></div>`;
}
let drPrevFocus = null;
function openSettings(t) {
  if (t) drTab = t;
  closePop();
  let dr = $('#drawer');
  if (!dr) {
    drPrevFocus = document.activeElement;
    document.body.insertAdjacentHTML('beforeend', `<div class="dr-scrim" id="drScrim" data-act="drClose"></div><div class="drawer glass" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drH" tabindex="-1"></div>`);
    dr = $('#drawer');
  }
  dr.innerHTML = `<div class="dr-h"><h2 id="drH">הגדרות</h2><button class="icon-btn x" data-act="drClose" aria-label="סגור את ההגדרות">${ICON.close}</button></div>
    <div class="dr-tabs" role="tablist" aria-label="קבוצות הגדרות">${DR_TABS.map(([id, label, ic, c]) => `<button class="dr-tab" role="tab" id="drt-${id}" aria-selected="${drTab === id}" aria-controls="drBody" tabindex="${drTab === id ? 0 : -1}" data-act="drTab" data-tab="${id}" style="--c:${c}"><span class="ti">${ICON[ic]}</span>${label}</button>`).join('')}</div>
    <div class="dr-body" id="drBody" role="tabpanel" aria-labelledby="drt-${drTab}">${drBody(drTab)}</div>`;
  if (document.activeElement?.classList.contains('dr-tab')) $(`#drt-${drTab}`)?.focus({ preventScroll: true }); else if (!dr.contains(document.activeElement)) dr.focus({ preventScroll: true });
}
function closeSettings() {
  const dr = $('#drawer'), sc = $('#drScrim'); if (!dr) return;
  dr.classList.add('out'); if (sc) sc.style.opacity = '0';
  setTimeout(() => { dr.remove(); sc?.remove(); drPrevFocus?.focus?.({ preventScroll: true }); }, 260);
}
function setSetting(path, val) {
  const [a, b] = path.split('.');
  if (b) settings[a] = { ...(a === 'smart' ? SMART_DEFAULT : {}), ...(settings[a] || {}), [b]: val }; else settings[a] = val;
  saveSettings();
}
const NORM = { trim: v => v.trim(), root: v => v.trim() || 'מטופלים', budget: v => Math.max(20, +v || 350), chars: v => Math.max(80, +v || 600) };
document.addEventListener('change', e => {
  const t = e.target; if (!t.matches?.('[data-set]')) return;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.norm) v = NORM[t.dataset.norm](v);
  setSetting(t.dataset.set, v);
  if (t.dataset.set === 'focus' || t.dataset.set.startsWith('smart.')) { applyLayout(); if (view === 'session' && session) renderSession(); else if (view === 'finish') renderFinish(); }
  if (t.dataset.set.startsWith('smart.') && v && session && view === 'session') { markDirtyAll(); runInsight(true); }
});

/* ---------------- events ---------------- */
document.addEventListener('click', e => { if (e.target.closest('a.mapgo')) setTimeout(closePop, 0); }); // the link opens, the menu closes
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const act = t.dataset.act;
  if (t.tagName === 'A') e.preventDefault();
  switch (act) {
    case 'settings': openSettings(t.dataset.tab); break;
    case 'drTab': drTab = t.dataset.tab; openSettings(); break;
    case 'drClose': closeSettings(); break;
    case 'home': go('home'); break;
    case 'resume': go('session'); break;
    case 'discard':
      if (session && (!session.savedAt || (session.changedAt || 0) > new Date(session.savedAt).getTime()) && !await confirmDlg('לסגור את המפגש?', 'יש במפגש דברים שלא נשמרו ב-Drive. אם תסגור, הם יימחקו מהמכשיר.', 'סגור ומחק', true)) return;
      if (recording) stopRec();
      stopPlayer();
      if (session) audioDelete(session.id);
      session = null; saveSession(true); render(); break;
    case 'pick': $('#pName').value = t.dataset.name; if (t.dataset.region) $('#pRegion').value = t.dataset.region; setPType('מפגש מעקב'); $('#pName').scrollIntoView({ block: 'center' }); break;
    case 'ptype': setPType(t.dataset.v); break;
    case 'start': startSession(); break;
    case 'rec': recording ? stopRec() : startRec(); break;
    case 'island': if (popKey === 'feed') closePop(); else openPop($('#island'), feedHtml(), 'feed'); break;
    case 'popClose': closePop(); break;
    case 'more': if (popKey === 'more') closePop(); else openPop(t, moreHtml(), 'more'); break;
    case 'region': if (popKey === 'region') closePop(); else openPop(t, regionPopHtml(), 'region'); break;
    case 'setRegion': setRegion(t.dataset.r); break;
    case 'unlock':
      t.disabled = true; t.innerHTML = '<span class="spin"></span> מתחבר…';
      try { await vaultUnlock(); view = session ? 'session' : 'home'; render(); }
      catch (err) { renderLocked(/decrypt|operation/i.test(err?.message || err?.name || '') ? 'המפתח בחשבון הזה לא פותח את הנתונים. בדוק שזה החשבון שבו הוגדרה ההצפנה.' : humanErr(err)); }
      break;
    case 'vaultReset':
      if (!await confirmDlg('למחוק את הנתונים המוצפנים?', 'המפגש הפתוח, רשימת המטופלים וההקלטות במכשיר יימחקו ולא יהיה אפשר לשחזר אותם. מה שכבר נשמר ב-Drive לא ייפגע.', 'מחק', true)) break;
      LS.del(K.session); LS.del(K.patients); try { indexedDB.deleteDatabase(AUDIO_DB); } catch { }
      settings.encrypt = false; saveSettings(); location.reload(); break;
    case 'keepRegion': session.regionKeep = t.dataset.r; touch(); refreshLive(); if (tab !== 'live') renderTab(); break;
    case 'tab': tab = t.dataset.tab; closePop(); renderTab(); window.scrollTo(0, 0); break;
    case 'jump': if (view !== 'session') { view = 'session'; render(); } jumpTo(t.dataset.fid); break;
    case 'edit': jumpTo(t.dataset.fid, true); break;
    case 'undo': {
      const id = t.dataset.fid, cur = session.fields[id], r = (session.recent || []).find(x => x.id === id);
      session.fields[id] = r?.prev ? { ...r.prev, rejected: cur?.value } : { value: '', locked: false, rejected: cur?.value };
      session.recent = (session.recent || []).filter(x => x.id !== id);
      markDirty([id]); touch(); refreshField(id); refreshLive(); refreshCounts(); toast('המילוי בוטל. אותו ערך לא יוכנס שוב אוטומטית.', false, 2600); break;
    }
    case 'src': { const id = t.dataset.fid; if (popKey === 'f:' + id) { closePop(); break; } showSource([id], t, 'f:' + id); break; }
    case 'srcRec': {
      const sec = t.dataset.sec, r = insState().record[sec]; if (!r) break;
      if (popKey === 'r:' + sec) { closePop(); break; }
      showSource((r.fields || []).filter(id => FIELD[id]), t, 'r:' + sec); t.classList.add('on'); break;
    }
    case 'confirm': { const f = session.fields[t.dataset.fid]; if (f) { f.needsCheck = false; f.unverified = false; f.confirmed = true; touch(); refreshField(t.dataset.fid); refreshLive(); } break; }
    case 'vConfirm': {
      const id = t.dataset.fid, f = session.fields[id], val = ($('#vt-' + id)?.value || '').trim(); if (!f) break;
      if (!val) { session.fields[id] = { value: '', locked: false, rejected: f.value }; }
      else if (val !== f.value) session.fields[id] = { ...f, value: val, source: 'manual', locked: true, needsCheck: false, unverified: false, at: Date.now() };
      else { f.needsCheck = false; f.unverified = false; f.confirmed = true; }
      markDirty([id]); touch(); renderFinish(); break;
    }
    case 'vClear': { const id = t.dataset.fid, f = session.fields[id]; session.fields[id] = { value: '', locked: false, rejected: f?.value }; markDirty([id]); touch(); renderFinish(); break; }
    case 'finish': closePop(); openFinish(); break;
    case 'toAnalysis': view = 'session'; tab = 'analysis'; render(); break;
    case 'saveDrive': {
      fin.phase = 'saving'; fin.err = ''; fin.msg = ''; const row = () => $('#saveRow');
      if (row()) row().innerHTML = saveRowHtml(0);
      try { await saveToDrive(m => { fin.msg = m; if (row()) row().innerHTML = saveRowHtml(0); }); fin.phase = 'saved'; }
      catch (e) { fin.phase = 'review'; fin.err = humanErr(e); }
      if (view === 'finish') renderFinish(); break;
    }
    case 'unlock': { const f = session.fields[t.dataset.fid]; if (f) { f.locked = false; saveSession(); refreshField(t.dataset.fid); } break; }
    case 'fillNow':
      if (!aiReady()) { toast('חסר קוד גישה. אפשר להוסיף אותו בהגדרות, בלשונית API.', true); return; }
      if (filling) { toast('מילוי כבר רץ'); return; }
      maybeFill(true); break;
    case 'insight':
      if (!aiReady()) { toast('חסר קוד גישה. אפשר להוסיף אותו בהגדרות, בלשונית API.', true); return; }
      markDirtyAll(); runInsight(true); break;
    case 'addNote': addNote(); break;
    case 'noteOpen': if (PHONE_MQ.matches && !noteFold && !$('#noteIn')?.value.trim()) setNoteFold(true); else setNoteFold(false); break;
    case 'encToggle': {
      e.preventDefault(); const want = !settings.encrypt;
      if (!want && !await confirmDlg('לכבות את ההצפנה?', 'הנתונים במכשיר יישמרו מעכשיו בלי הצפנה.', 'כבה הצפנה', true)) break;
      t.disabled = true;
      try { await setEncryption(want); } catch (err) { toast('לא הצלחתי: ' + humanErr(err), true, 6000); }
      t.disabled = false; t.checked = !!settings.encrypt; break;
    }
    case 'taskDone': { const n = (session?.notes || []).find(x => x.id === t.dataset.nid); if (n) { n.done = !n.done; touch(); t.setAttribute('aria-pressed', n.done); t.closest('li')?.classList.toggle('done', n.done); } break; }
    case 'hypoNow': { const before = insState().at.hypo; runInsight(false, ['hypo']).then(() => { const ins = session && insState(); if (ins && ins.at.hypo !== before && !ins.hypo.length) toast('עדיין אין מספיק ממצאים להשערות', false, 2600); }); break; }
    case 'verifyPart': { const s = session, ids = CARD_SRC[t.dataset.part](s).filter(id => s.fields[id]?.value && (s.fields[id].needsCheck || s.fields[id].unverified)); if (ids.length) showSource(ids, t, 'v:' + t.dataset.part); break; }
    case 'noteDel': session.notes = (session.notes || []).filter(n => n.id !== t.dataset.nid); touch(); refreshLive(); if (view === 'finish') renderFinish(); break;
    case 'noteUnfile': unfileNote(t.dataset.nid); break;
    case 'addManual': { const ta = $('#manualText'); if (ta.value.trim()) { addSegment(ta.value, true); ta.value = ''; } break; }
    case 'segPlay': playSeg(+t.dataset.i); break;
    case 'missLevel': missOpen[t.dataset.k] = !missOpen[t.dataset.k]; refreshLive(); break;
    case 'plToggle':
      if (!PL.audio) break;
      if (PL.audio.paused) { if (recording) { toast('ההשמעה זמינה כשההקלטה עצורה', true); break; } PL.audio.play().catch(() => { }); }
      else PL.audio.pause();
      break;
    case 'plSeek': if (PL.audio) { PL.audio.currentTime = Math.max(0, PL.audio.currentTime + +t.dataset.d); renderPlayerTime(); } break;
    case 'plClose': stopPlayer(); break;
    case 'analyze': {
      const m = regionMismatch();
      if (m) {
        const v = await ask({ title: 'האזור לא תואם את התוכן', text: `התוכן של המפגש נראה על ${m}, אבל האזור שהוגדר הוא ${session.region}. הניתוח יישען על בסיס הידע של האזור שתבחר.`,
          buttons: [{ label: `שנה ל${m} והפק`, value: 'change', primary: true }, { label: `הפק לפי ${session.region}`, value: 'keep' }, { label: 'ביטול', value: null }] });
        if (!v) break;
        if (v === 'change') setRegion(m); else { session.regionKeep = m; touch(); }
      }
      if (session?.analysis && !t.dataset.retry && !await confirmDlg('להחליף את הניתוח?', 'הניתוח הקיים יוחלף בניתוח חדש.', 'הפק ניתוח חדש')) break;
      if (tab !== 'analysis') { tab = 'analysis'; renderTab(); }
      runAnalysis(); break;
    }
    case 'download': downloadCopy(); break;
    case 'copyLog': {
      const dump = JSON.stringify({ ua: navigator.userAgent, engine: settings.engine, continuous: settings.continuous, lang: settings.lang, saveAudio: settings.saveAudio, events: rawLog }, null, 1);
      try { await navigator.clipboard.writeText(dump); toast(`הלוג הועתק (${rawLog.length} אירועים). הדבק אותו בצ'אט.`); }
      catch {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([dump], { type: 'application/json' }));
        a.download = 'speech-log.json'; a.click(); toast('הלוג ירד כקובץ speech-log.json');
      }
      break;
    }
    case 'testKey': testKey(t); break;
    case 'testDrive': testDrive(t); break;
    case 'testSoniox': testSoniox(t); break;
    case 'refreshKb': refreshKb(t); break;
    case 'theme': setTheme(t.dataset.theme); $$('[data-act="theme"]').forEach(b => b.setAttribute('aria-pressed', b === t)); break;
    case 'trOpen':
      if (wide) { settings.sideW = settings.sideLast || 'medium'; saveSettings(); applyLayout(); } else trOpenNarrow = true;
      renderSession(); break;
    case 'trHide':
      if (wide) { if ((settings.sideW || 'medium') !== 'hidden') settings.sideLast = settings.sideW || 'medium'; settings.sideW = 'hidden'; saveSettings(); applyLayout(); } else trOpenNarrow = false;
      renderSession(); $('.trtab')?.focus({ preventScroll: true }); break;
    case 'sideW': case 'density':
      if (act === 'sideW' && t.dataset.v !== 'hidden') settings.sideLast = t.dataset.v;
      settings[act === 'sideW' ? 'sideW' : 'density'] = t.dataset.v; saveSettings(); applyLayout();
      $$(`[data-act="${act}"]`).forEach(b => b.setAttribute('aria-pressed', b === t));
      if (act === 'sideW' && view === 'session' && session) { const reopen = popKey === 'more'; renderSession(); if (reopen) openPop($('[data-act="more"]'), moreHtml(), 'more'); } break;
    case 'focus': closePop(); settings.focus = !settings.focus; saveSettings(); applyLayout(); renderSession(); toast(settings.focus ? 'מצב פוקוס' : 'יציאה ממצב פוקוס', false, 1300); break;
    case 'pane': { const order = ['hidden', 'narrow', 'medium', 'wide'], cur = settings.sideW || 'medium';
      settings.sideW = order[(order.indexOf(cur) + 1) % order.length]; saveSettings(); applyLayout(); renderSession();
      toast('חלונית התמלול: ' + SIDE_LABEL[settings.sideW], false, 1300); break; }
    case 'cycleTheme': {
      const ids = THEMES.map(x => x[0]), next = ids[(ids.indexOf(getTheme()) + 1) % ids.length];
      setTheme(next); toast('תצוגה: ' + THEMES.find(x => x[0] === next)[1], false, 1400); break;
    }
    case 'kbDefault':
      if (settings.kbDocs.trim() !== KB_DEFAULT && !await confirmDlg('להחזיר את הרשימה המוכנה?', 'הרשימה הנוכחית של הסיכומים תוחלף ברשימה המוכנה.', 'החלף')) return;
      settings.kbDocs = KB_DEFAULT; saveSettings(); $('#sKb').value = KB_DEFAULT; toast('הרשימה המוכנה הוחזרה'); break;
    case 'wipe':
      if (!await confirmDlg('למחוק את כל הנתונים המקומיים?', 'מפתחות, רשימת מטופלים ומפגש פתוח יימחקו מהמכשיר. קבצים ב-Drive לא נמחקים.', 'מחק הכול', true)) return;
      Object.values(K).forEach(LS.del); try { sessionStorage.clear(); } catch { }
      try { await caches.delete(KB_CACHE); } catch { }
      try { indexedDB.deleteDatabase(AUDIO_DB); } catch { }
      location.reload(); break;
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('#drawer')) { closeSettings(); return; } if (trOverlay()) { trOpenNarrow = false; renderSession(); return; } if (popEl) { const a = popAnchor; closePop(); a?.focus?.(); return; } }
  if (e.key === 'Enter' && e.target.id === 'noteIn') { e.preventDefault(); addNote(); return; }
  const t = e.target;
  if (t.matches?.('.dr-tab') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    const ids = DR_TABS.map(x => x[0]), i = ids.indexOf(drTab);
    drTab = ids[e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowLeft' ? 1 : -1) + ids.length) % ids.length];
    e.preventDefault(); openSettings(); return;
  }
  if (e.key === 'Tab' && $('#drawer')) { // keep focus inside the drawer while it is open
    const f = $$('#drawer button, #drawer input, #drawer select, #drawer textarea, #drawer a[href]').filter(x => !x.disabled && x.offsetParent);
    if (f.length && e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (f.length && !e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
document.addEventListener('submit', e => e.preventDefault()); // the note bar's button and Enter key add the note themselves
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.matches?.('details.stg')) return;
  if (d.open) openStages.add(d.dataset.stage); else openStages.delete(d.dataset.stage);
}, true);
let editInsightTimer = null; // a typed field updates the record and graphics too, once the typing pauses
document.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('#tabBody textarea[data-fid]')) {
    autosize(t);
    const id = t.dataset.fid, val = t.value;
    session.fields[id] = { ...(session.fields[id] || {}), value: val, source: 'manual', locked: true, needsCheck: false, at: Date.now() };
    if (!val.trim()) session.fields[id] = { value: '', locked: false };
    markDirty([id]); syncStage(); touch(); refreshCounts();
    clearTimeout(editInsightTimer); editInsightTimer = setTimeout(() => { if (aiReady() && smartAny()) runInsight(); }, 2500);
  }
  if (t.id === 'noteIn') { const b = t.closest('form')?.querySelector('.send'); if (b) b.disabled = !t.value.trim(); }
});
document.addEventListener('focusout', e => {
  const t = e.target;
  if (t.matches('#tabBody textarea[data-fid]')) { const id = t.dataset.fid; setTimeout(() => { refreshField(id); refreshMissing(); if (tab === 'summary') refreshDocPrev(); }, 180); }
  // an empty note bar folds away again on a phone once the focus leaves it
  if (t.id === 'noteIn' && PHONE_MQ.matches) setTimeout(() => { if (!$('#noteBar')?.contains(document.activeElement) && !t.value.trim()) setNoteFold(true); }, 150);
});
function setPType(v) { $$('#pType [data-act="ptype"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); }
async function startSession() {
  const name = $('#pName').value.trim();
  if (!name) { toast('הכנס שם מטופל', true); $('#pName').focus(); return; }
  if (!$('#pConsent').checked) { toast('יש לאשר שהמטופל הסכים להקלטה', true); return; }
  if (session && !session.savedAt && !await confirmDlg('להחליף את המפגש הפתוח?', 'יש מפגש פתוח שלא נשמר ב-Drive. מפגש חדש יחליף אותו.', 'התחל מפגש חדש', true)) return;
  const p = patients.find(x => x.name === name);
  const type = $('#pType [aria-pressed="true"]')?.dataset.v || TYPES[0];
  session = {
    id: Date.now().toString(36), patientName: name, region: $('#pRegion').value, type,
    consent: true, consentAt: new Date().toISOString(), startedAt: new Date().toISOString(), stage: 'anamnesis', segments: [], processed: 0,
    fields: { name: { value: name, source: 'manual', locked: true } }, analysis: '', cost: 0, notes: [],
    folderId: p?.folderId || null
  };
  upsertPatient({ name, region: session.region, last: session.startedAt });
  saveSession(true); tab = 'live'; openStages = new Set([session.stage]); lastStatus = { html: '', err: false, raw: false };
  loadTestNames();
  go('session');
}
async function testKey(btn) {
  const f = $('#sAccess'); if (f) { settings.accessCode = f.value.trim(); saveSettings(); }
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> בודק…';
  try {
    const r = await callWithFallback({ model: 'claude-haiku-5-5', max_tokens: 20, messages: [{ role: 'user', content: 'ענה במילה אחת: תקין' }], thinking: { type: 'disabled' } });
    toast('החיבור ל-Claude תקין. ' + ((r.content || []).find(b => b.type === 'text')?.text || ''));
  } catch (e) { toast(humanErr(e), true, 6000); }
  finally { btn.disabled = false; btn.textContent = 'בדוק חיבור ל-Claude'; }
}
// the whole path, end to end: access code → the site's function → temporary key → a Soniox session
// that gets half a second of silence and is closed at once (costs a fraction of a cent, no microphone)
async function testSoniox(btn) {
  const f = $('#sAccess'); if (f) { settings.accessCode = f.value.trim(); saveSettings(); }
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> בודק…';
  try {
    if (!settings.accessCode) throw new Error('חסר קוד גישה לתמלול');
    const key = await sonioxKey();
    await new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket', ['soniox-api-key', key]);
      const end = (err) => { if (settled) return; settled = true; clearTimeout(tm); try { ws.close(); } catch { } err ? reject(err) : resolve(); };
      const tm = setTimeout(() => end(new Error('Soniox לא ענה תוך 15 שניות')), 15000);
      ws.onopen = () => {
        ws.send(JSON.stringify({ model: 'stt-rt-v5', audio_format: 'pcm_s16le', sample_rate: 16000, num_channels: 1, language_hints: ['he', 'en'] }));
        ws.send(new Uint8Array(16000)); // 0.5 s of silence
        ws.send('');
      };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch { return; }
        if (m.error_code) end(new Error(m.error_code === 402 ? 'אין יתרה בחשבון Soniox' : `Soniox ${m.error_code}: ${m.error_message || m.error_type || ''}`));
        else if (m.finished) end();
      };
      ws.onerror = () => { };
      ws.onclose = ev => end(new Error(`החיבור ל-Soniox נסגר בלי תשובה (קוד ${ev.code})`));
    });
    toast('החיבור ל-Soniox תקין: קוד הגישה, המפתח בשרת והחשבון עובדים');
  } catch (e) { toast(e.message, true, 8000); }
  finally { btn.disabled = false; btn.textContent = 'בדוק חיבור ל-Soniox'; }
}
async function testDrive(btn) {
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> מתחבר…';
  try {
    await getToken();
    const id = await ensureRoot();
    toast('מחובר. תיקיית "' + settings.rootFolderName + '" מוכנה ב-Drive');
    return id;
  } catch (e) { toast(e.message, true, 7000); }
  finally { btn.disabled = false; btn.textContent = 'התחבר ובדוק'; }
}
// reads every source again, then shows what each region's analysis would receive and roughly what it costs
async function refreshKb(btn) {
  const st = $('#kbStatus'), lines = [];
  const show = (busy) => { st.innerHTML = lines.join('<br>') + (busy ? `<br><span class="spin"></span> ${esc(busy)}…` : ''); };
  const ok = s => `<span class="kb-dot" style="background:var(--ok)"></span>${esc(s)}`, bad = s => `<span class="kb-dot" style="background:var(--rec)"></span><span style="color:var(--rec)">${esc(s)}</span>`;
  if (btn) btn.disabled = true;
  try {
    if (settings.siteKB) {
      show('מפת הדרך מהאתר');
      try {
        const s = await loadSite(true);
        lines.push(ok(`מפת הדרך${s.stale ? ' (עותק שמור — האתר לא זמין)' : ''} · ${Object.keys(s.data.T || {}).length} מבדקים · ${s.data.REGIONS.map(r => r.name || r.id).join(', ')}`));
      } catch (e) { lines.push(bad(e.message)); }
    }
    const entries = parseKbDocs(), seen = new Map();
    entries.filter(d => d.bad).forEach(d => lines.push(bad('שורה לא מזוהה: ' + d.bad.slice(0, 50))));
    for (const d of entries.filter(d => d.id)) { if (!seen.has(d.id)) seen.set(d.id, []); seen.get(d.id).push(d); }
    if (seen.size && !settings.clientId) lines.push(bad('Drive לא מחובר — הוסף Client ID והתחבר כדי לקרוא את הסיכומים'));
    else {
      let n = 0;
      for (const [id, uses] of seen) {
        show(`קורא מ-Drive ${++n}/${seen.size}`);
        try {
          const c = await fetchDoc(id, true);
          const where = uses.map(u => (u.regions ? u.regions.join(', ') : 'כל האזורים') + (u.parts ? ` [${u.parts.join(', ')}]` : '')).join(' ; ');
          const miss = uses.filter(u => u.parts).flatMap(u => pickParts(c.text, u.parts).missing);
          lines.push(ok(`${c.title} — ${kChars(c.text.length)} תווים · ${where}`) + (miss.length ? ' ' + bad('לא נמצא: ' + [...new Set(miss)].join(', ')) : ''));
        } catch (e) { lines.push(bad(e.message)); }
      }
    }
    // per-region totals (from the cache just filled)
    const p = PRICE[settings.analysisModel] || [4, 20];
    const rows = [];
    for (const region of REGIONS) {
      show('מחשב היקף לכל אזור: ' + region);
      const kb = await loadKB(region);
      let tok = null;
      if (aiReady() && kb.docs.length) {
        try { tok = await countTokens({ model: settings.analysisModel, system: ANALYSIS_SYSTEM, messages: [{ role: 'user', content: kbBlock(kb.docs) }] }); } catch { }
      }
      rows.push(`<tr><td>${esc(region)}</td><td>${kb.docs.length}</td><td>${kChars(kb.chars)}</td><td>${tok ? Math.round(tok / 1000) + 'K' : '—'}</td><td>${tok ? '$' + (tok * p[0] / 1e6).toFixed(2) : '—'}</td></tr>`);
    }
    lines.push(`<table class="kbt"><tr><th>אזור</th><th>מסמכים</th><th>תווים</th><th>טוקנים</th><th>קלט ≈</th></tr>${rows.join('')}</table>` +
      `<span class="small muted">עלות הקלט בלבד, במודל ${esc(settings.analysisModel)}. התשובה עצמה (כולל חשיבה) מוסיפה בדרך כלל $0.05–0.30.</span>`);
    show();
  } catch (e) { lines.push(bad(e.message)); show(); }
  finally { if (btn) btn.disabled = false; }
}

/* ---------------- boot ---------------- */
LS.del(K.kb); // v1 kept document texts in localStorage; they now live in Cache Storage
applyTheme();
if (isLocked()) renderLocked(); else render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
