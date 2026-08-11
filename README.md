# City of Habits

A private, offline-first personal habit companion where small real-world actions leave permanent traces in a calm city.

There are no streaks, scores, coins, leaders, decay mechanics, ads, social feeds, accounts, trackers, or AI coaching. A difficult day does not damage your city.

## What it does

- Create several habits with an action, a cue, a minimum version, a cadence, and a city district.
- Use **Done**, **Not today**, and **Undo** for each scheduled habit. Cadence controls which habits appear in Today: daily, weekdays, weekends, or once a week on a stable assigned weekday derived from the habit name.
- Explore a deterministic, evolving city: completed habit events add durable buildings and district details.
- Edit, pause, resume, and archive habits.
- Use the weekly check-in to keep a plan, make its minimum smaller, change its cue, or pause it. Paused habits are excluded from Today and the weekly active list until resumed, while their history and city contributions remain.
- Keep all data locally in the browser; download a full local backup and restore it later.
- Import the earlier single-habit prototype state when it is detected locally.

## Run locally

From this repository:

```bash
cd web
python3 -m http.server 8000
```

Open `http://localhost:8000`.

No build step, account, API, cookies, third-party analytics, or remote dependency is used.

## Data and privacy

The app stores its state only in your browser `localStorage` under `cityOfHabits_v1`. Nothing is transmitted anywhere.

**Export data** creates a downloadable JSON backup containing your habit titles and completion history. Treat that file as private. **Import backup** replaces the current local City of Habits data only after confirmation and strict schema validation. Every habit field, history action, and weekly reference is checked; a malformed or mismatched backup is rejected without changing local state.

## Static deployment

The deployable static site lives in `web/`. Point a static host or Vercel project at that directory.

## Project files

- `web/index.html` — semantic application shell and accessible dialogs
- `web/styles.css` — responsive visual design and reduced-motion support
- `web/app.js` — local state, habit management, deterministic city renderer, backup and import
- `TEST_PLAN.md` — manual acceptance test plan
