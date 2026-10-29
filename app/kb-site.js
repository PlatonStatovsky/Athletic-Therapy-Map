/* Reads the athletic-therapy-map site (index.html) as data and renders a compact text
   knowledge base for one region. Nothing from the site is executed: the data literals
   are cut out of the page source and parsed with JSON5. */
(function (root) {
  'use strict';
  const NAMES = ['T', 'GENERAL', 'REGIONS', 'FIVE_D', 'THREE_N', 'TEST_GEN', 'TX', 'TX2', 'TX3', 'FOUND'];
  // app region label → site region id
  const REGION_ID = { 'צוואר וראש': 'neck', 'כתף': 'shoulder', 'מרפק': 'elbow', 'שורש כף יד וכף יד': 'hand' };

  function extractLiterals(src, names) {
    const out = {};
    for (const name of names) {
      const m = new RegExp('(?:^|\\n)\\s*const\\s+' + name + '\\s*=\\s*([\\[{])').exec(src);
      if (!m) continue;
      let i = m.index + m[0].length - 1, depth = 0;
      const start = i;
      for (; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; } continue; }
        if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
        if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') { depth--; if (depth === 0) { out[name] = src.slice(start, i + 1); break; } }
      }
    }
    return out;
  }
  function parseSite(html, JSON5) {
    const lit = extractLiterals(html, NAMES), data = {};
    for (const n of NAMES) if (lit[n]) data[n] = JSON5.parse(lit[n]);
    if (!data.GENERAL || !data.REGIONS) throw new Error('מבנה האתר השתנה — לא נמצאו GENERAL / REGIONS');
    return data;
  }

  // ---------- rendering ----------
  const clean = s => String(s ?? '').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1').replace(/\s+\n/g, '\n').trim();
  const li = arr => (arr || []).map(x => '- ' + clean(Array.isArray(x) ? x.join(' — ') : x)).join('\n');
  const table = rows => (rows || []).map(r => '| ' + r.map(clean).join(' | ') + ' |').join('\n');
  function testName(d, id) { return d.T?.[id]?.n || d.TEST_GEN?.[id]?.n || id; }
  function block(d, b) {
    const out = [];
    if (b.h) out.push('**' + clean(b.h) + '**');
    if (b.p) out.push(clean(b.p));
    if (b.li) out.push(li(b.li));
    if (b.table) out.push(table(b.table));
    if (b.tests) out.push('מבדקים: ' + b.tests.map(t => testName(d, t)).join(', '));
    if (b.hist) {
      const h = b.hist;
      out.push(`היסטוריה של ההגדרה (${clean(h.tag)}): היה — ${clean(h.was)} · היום — ${clean(h.now)} · למה — ${clean(h.why)} · משמעות קלינית — ${clean(h.so)}`);
    }
    return out.filter(Boolean).join('\n');
  }
  function renderGeneral(d) {
    const g = d.GENERAL; const out = ['## מסגרת כללית — שמונה שלבים', clean(g.intro)];
    g.steps.forEach((s, i) => {
      out.push(`### ${i + 1} · ${clean(s.t)}${s.sub ? ' — ' + clean(s.sub) : ''}`);
      (s.body || []).forEach(b => out.push(block(d, b)));
      if (s.dec) out.push(`החלטה: ${clean(s.dec.q)} כן ← ${clean(s.dec.yes)} · לא ← ${clean(s.dec.no)}`);
      (s.after || []).forEach(b => out.push(block(d, b)));
    });
    return out.join('\n\n');
  }
  function renderFound(d) {
    if (!d.FOUND) return '';
    const out = ['## עקרונות'];
    for (const t of d.FOUND.topics) {
      out.push(`### ${clean(t.t)}${t.sub ? ' — ' + clean(t.sub) : ''}`);
      (t.blocks || []).forEach(b => out.push(block(d, b)));
    }
    return out.join('\n\n');
  }
  function renderTest(d, id) {
    const t = d.T?.[id] || d.TEST_GEN?.[id] || {}, x = d.TX?.[id] || d.TX2?.[id] || d.TX3?.[id] || {};
    const out = [`#### ${clean(t.n || id)}`];
    if (x.aim) out.push('מטרה: ' + clean(x.aim));
    if (x.pt) out.push('מטופל: ' + clean(x.pt));
    if (x.th) out.push('מטפל: ' + clean(x.th));
    if (x.steps) out.push('ביצוע: ' + x.steps.map((s, i) => `${i + 1}. ${clean(s[1])}`).join(' '));
    else if (t.how) out.push('ביצוע: ' + clean(t.how));
    out.push('חיובי: ' + clean(x.pos || t.pos || '—'));
    if (x.neg) out.push('שלילי: ' + clean(x.neg));
    if (x.evs || x.evd) out.push('ראיות: ' + [clean(x.evs), clean(x.evd)].filter(Boolean).join(' — '));
    if (x.contra) out.push('זהירות: ' + clean(x.contra));
    if (x.tips?.length) out.push('דגשים: ' + x.tips.map(clean).join(' · '));
    return out.join('\n');
  }
  function renderRegion(d, r) {
    const out = [`## ${clean(r.name)}`];
    if (r.anam) out.push('**אנמנזה:** ' + clean(r.anam));
    if (r.s1) {
      out.push(`### סינון דגלים אדומים\nהחלטה: ${clean(r.s1.q)} כן ← ${clean(r.s1.yes)}`);
      for (const c of r.s1.checks || []) {
        const lines = [`**${clean(c.title)}**`];
        if (c.chain) lines.push(c.chain.map((s, i) => `${i + 1}. ${clean(s[0])} כן ← ${clean(s[1])}`).join('\n'));
        if (c.tests) lines.push('מבדקים: ' + c.tests.map(t => testName(d, t)).join(', '));
        if (c.li) lines.push(li(c.li));
        if (c.table) lines.push(table(c.table));
        if (c.list5d) lines.push(`5D's: ${(d.FIVE_D || []).map(clean).join(' · ')} | 3N's: ${(d.THREE_N || []).map(clean).join(' · ')}`);
        if (c.note) lines.push(clean(c.note));
        out.push(lines.join('\n'));
      }
    }
    if (r.s2) out.push(`### בדיקה בסיסית\n${clean(r.s2.text)}\n${li(r.s2.rules)}`);
    if (r.q) out.push(`**שאלון: ${clean(r.q.name)}** — ${clean(r.q.items)}\n${table(r.q.score)}`);
    if (r.s3) {
      out.push(`### סיווג — ${clean(r.s3.q)}`);
      for (const p of r.s3.patterns) {
        out.push(`#### ${clean(p.title)}${p.pic ? ' (' + clean(p.pic) + ')' : ''}`);
        for (const x of p.paths) {
          const l = [`**${clean(x.n)}**`];
          if (x.clue) l.push('מה שומעים ורואים: ' + clean(x.clue));
          if (x.tests?.length) l.push('מבדקים לפי הסדר: ' + x.tests.map(t => testName(d, t)).join(' ← ') + (x.order ? ` (${clean(x.order)})` : ''));
          if (x.pos) l.push('חיובי: ' + clean(x.pos));
          if (x.neg) l.push('שלילי: ' + clean(x.neg));
          if (x.tx) l.push('טיפול: ' + clean(x.tx));
          if (x.prog) l.push('פרוגנוזה וחזרה: ' + clean(Array.isArray(x.prog) ? x.prog.join(' · ') : x.prog));
          if (x.ref) l.push('מתי מפנים: ' + clean(x.ref));
          out.push(l.join('\n'));
        }
      }
    }
    if (r.prog) out.push('### פרוגנוזה\n' + li(r.prog));
    if (r.rts) out.push('**חזרה לספורט:** ' + clean(r.rts));
    if (r.tx) out.push('### טיפול\n' + clean(r.tx));
    if (r.phases) out.push(table([['שלב', 'מה עושים'], ...r.phases]));
    if (r.principles) out.push(li(r.principles));
    if (r.surgery) out.push('**ניתוח:** ' + clean(r.surgery));
    if (r.re) out.push(`### מעקב\n${clean(r.re.m)} · שיפור ← ${clean(r.re.yes)} · אין שיפור ← ${clean(r.re.no)}`);
    // full cards for every test this region uses
    const ids = new Set();
    JSON.stringify(r, (k, v) => { if (k === 'tests' && Array.isArray(v)) v.forEach(t => ids.add(t)); return v; });
    if (ids.size) out.push('### כרטיסי מבדקים\n' + [...ids].map(id => renderTest(d, id)).join('\n\n'));
    return out.join('\n\n');
  }
  function regionText(d, regionLabel) {
    const id = REGION_ID[regionLabel];
    const r = id && d.REGIONS.find(x => x.id === id);
    const parts = ['# שיקום שמרני — מפת דרך (athletic-therapy-map — בסיס הידע המאומת של המטפל)', renderGeneral(d), renderFound(d)];
    if (r) parts.push(renderRegion(d, r));
    else parts.push(`(לאזור "${regionLabel}" אין עדיין פרק באתר — רק המסגרת הכללית והעקרונות.)`);
    return parts.filter(Boolean).join('\n\n');
  }
  const api = { extractLiterals, parseSite, regionText, REGION_ID };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SiteKB = api;
})(typeof self !== 'undefined' ? self : this);
