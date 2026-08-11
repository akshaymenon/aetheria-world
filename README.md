# Habit Loop Concept Test

A polished, self-contained interactive prototype for a comparative concept test of three habit-tracking wrappers around an identical one-habit loop.

## Versions

- **City of Habits** — a permanent calm city that grows with each completed day.
- **Garden of Habits** — a permanent garden that adds plants with each completed day.
- **Clear Day** — a plain tracker control with a simple grid of checkmarks.

The underlying habit loop is identical in every version: one observable action, one cue/context, one minimum version, and daily entries of **Done**, **Not today**, or **Undo**.

## Design principles

- No streaks, coins, XP, leaderboards, decay, guilt, ads, AI, or social features.
- Completed days trigger an immediate, deterministic visual transformation.
- Missed days never remove or decay progress.
- All data stays in the browser (`localStorage`).
- No external dependencies; vanilla HTML, CSS, and JavaScript only.

## Running locally

From this directory, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a web browser.

## Participant flow

1. **Consent screen** — participants read the privacy notice and confirm that data stays in the browser.
2. **Random assignment** — participants are randomly assigned to one of the three versions. Researchers can override assignment with the query parameter `?condition=city`, `?condition=garden`, or `?condition=clear`, or by selecting a version on the consent screen.
3. **Habit setup** — participants enter an observable action, a cue/context, and a minimum version.
4. **Tracker** — participants mark each day as **Done** or **Not today**. **Done** adds a permanent element to the visualization. **Undo** removes today’s entry only.
5. **Reflection** — optional sliders capture expected usefulness, calmness, clarity, pressure, and would-be-disappointed feelings.
6. **Export** — researchers can export the full local event log and feedback as JSON.

## Data and privacy

All state is stored in the browser’s `localStorage` under the key `habitLoopStudy_v1`. Nothing is transmitted to any server. Participants can clear all data at any time from the researcher tools section.

## Files

- `index.html` — app structure.
- `styles.css` — cozy editorial design, responsive layout, reduced-motion support.
- `app.js` — application logic, event logging, export, and SVG visualizations.
- `TEST_PLAN.md` — manual test plan.
