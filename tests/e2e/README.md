# Thalamus browser checks (Playwright, Python)

Scripts Claude used to check every change to the assistant on a phone (390×844) and a tablet (1240×860), and to take the before/after screenshots for the change log. They drive the real app in headless Chromium; Claude, Soniox, Google and Drive are faked with Playwright routes, so no key or account is needed. Every value that looks like a key in here is a dummy (`sk-ant-old`, access code `x`).

## Run

```bash
# from the repo root: serve the site the way Cloudflare does (output directory = repo root)
python3 -m http.server 8766 --bind 127.0.0.1 &
cd tests/e2e
pip install playwright && python3 -m playwright install chromium   # once, if not installed
python3 spec_regress.py      # full tour of the app; the line to look for is "errors: []"
```

Each script writes its screenshots into a folder next to it (ignored by git).

## Which script checks what

The scripts build on each other with `exec(open(...).read().split(...)[0])`, so keep them in one folder.

| Script | What it checks |
|---|---|
| `spec_regress.py` | Whole app tour on phone and tablet; must end with `errors: []` |
| `verify_finish3.py` | Finish screen: the gate on "סיום", read-only verify rows, card heights, recording player |
| `vizver.py` | Finish screen: "אמת" on the body map and the injury course, save blocked until both are confirmed |
| `norec.py` | Session without recording consent: popup, island, 11 required fields, no recording section |
| `hypo.py` | Hypotheses board: threshold, 1–5, stable order and marks, rule out / add from the map, red flags |
| `ev5.py` | Hypotheses board: 0–5 supporting / contradicting facts (model returns 8, board shows 5), empty column label; `ev5_compose.py` makes the before/after image |
| `hint_norec.py` | Threshold hint names every counted field (first visit and follow-up); `hint_compose.py` makes the before/after images |
| `norec_tr.py` | Session without recording: no transcript button, side panel or overlay; old typed lines kept in the data and the Drive doc; a normal session keeps the transcript. `notr_compose.py` makes the before/after images |
| `home.py` | Home page, old `/#knee` links sent to `/map/`, app links and the knowledge base read from `/map/` |
| `play_check.py` | Real MediaRecorder audio: ▶ on a quote plays only that quote |
| `rec_lock.py` | Record locked 24 h after the first save, on a wide screen |
| `ba*_shots.py`, `ba*_compose.py` | Before/after screenshots: run against the old commit on port 8767 (`git worktree add <dir> <commit>` and serve it) and the current one on 8766, then compose labelled images for the SRS log |

Base helpers: `spec_shots.py` (`mkp`, `shot`, fake routes), `run20.py` (demo session `SEED`, `EXAM`, fake `INSIGHT`), `verify_finish.py` (`EMPTY`, `finish_from_session`, `CALLS`). The `run*.py` files are earlier one-off checks kept for reference; a few write into `.impeccable/` or old paths and are not part of the regular run.
