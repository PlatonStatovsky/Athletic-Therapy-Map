const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const html = "<!doctype html><html><head><meta charset=utf-8></head><body>" + fs.readFileSync(__dirname + "/upper-quadrant-map.html","utf8") + "</body></html>";
const errors = [];
const vc = new VirtualConsole(); vc.on("jsdomError", e => errors.push(e.message)); vc.on("error", e => errors.push(String(e)));
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x.test/#shoulder", virtualConsole: vc, pretendToBeVisual: true,
  beforeParse(w){ w.matchMedia = q => ({ matches: false, addEventListener(){}, removeEventListener(){} }); w.HTMLElement.prototype.scrollIntoView = function(){}; w.scrollTo = () => {}; } });
const w = dom.window, d = w.document;
const T = w.eval("T"), TX = w.eval("TX");
console.log("errors", errors);
const ids = Object.keys(T);
const miss = ids.filter(k => !TX[k]), noSteps = ids.filter(k => TX[k] && !TX[k].steps), noEv = ids.filter(k => TX[k] && !TX[k].evs), extra = Object.keys(TX).filter(k => !T[k]);
const badPair = []; Object.entries(TX).forEach(([k, x]) => (x.pair || []).forEach(p => { if(!T[p]) badPair.push(k + "→" + p); }));
console.log("tests", ids.length, "TX", Object.keys(TX).length, "missing", miss, "noSteps", noSteps, "noEv", noEv, "extra", extra, "badPair", badPair);
// text hygiene
const all = JSON.stringify(TX);
console.log("→", (all.match(/→/g)||[]).length, "≥≤≠", (all.match(/[≥≤≠]/g)||[]).length, "ascii quotes inside hebrew?", (all.match(/[א-ת]"[א-ת]/g)||[]).length);
// links
const links = [...all.matchAll(/\]\((https?:[^\s]+?)\)(?=[^)]|$)/g)].map(m => m[1]);
// render each test card
let bad = [], counts = { pt:0, th:0, links:0, who:0 };
for (const id of ids) {
  try {
    w.eval(`(function(){})()`);
    d.querySelectorAll('[data-test="' + id + '"]')[0];
    // call openTest via a fake chip click
    const b = d.createElement("button"); b.setAttribute("data-test", id); d.body.appendChild(b); b.click(); b.remove();
    const box = d.querySelector("#pbody");
    const h3 = box.querySelector("h3");
    if(!h3) { bad.push(id + ": no h3"); continue; }
    counts.pt += box.querySelectorAll("ol.steps li.pt").length; counts.th += box.querySelectorAll("ol.steps li.th").length;
    counts.links += box.querySelectorAll(".evx a").length; counts.who += box.querySelectorAll(".who").length;
    if(box.querySelector(".evx") && /\]\(http/.test(box.querySelector(".evx").textContent)) bad.push(id + ": raw link markup");
    if(/undefined|null/.test(box.textContent)) bad.push(id + ": undefined/null text");
  } catch(e) { bad.push(id + ": " + e.message); }
}
console.log("render problems", bad);
console.log("counts", counts);
// sample card
const b = d.createElement("button"); b.setAttribute("data-test", "hook"); d.body.appendChild(b); b.click();
console.log(d.querySelector("#pbody").textContent.replace(/\s+/g, " ").slice(0, 900));
console.log("who sample:", [...d.querySelectorAll("#pbody .who")].slice(0,6).map(e => e.className + ":" + e.textContent).join(" | "));
console.log("errors after", errors);
// search
const q = d.querySelector("#q");
for (const term of ["Hook", "וו", "מטפל", "Kehr", "CTS", "נימול"]) { q.value = term; q.dispatchEvent(new w.Event("input"));
  console.log("search", term, [...d.querySelectorAll("#results .rgroup")].map(g => g.querySelector("h6").textContent + ":" + g.querySelectorAll(".res").length).join(" ")); }
console.log("abbr tab/ toggle present?", !!d.querySelector("#pt-abbr"), !!d.querySelector("#ab-open"), "glosses", d.querySelectorAll(".gl").length, "abbr tags", d.querySelectorAll("abbr.ab").length);
