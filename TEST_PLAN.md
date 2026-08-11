# Test Plan — Habit Loop Concept Test

Run the prototype with `python3 -m http.server 8000` and open `http://localhost:8000`.

## 1. First load and consent

1. Load the page in a fresh browser profile (or clear `localStorage` for `localhost:8000`).
2. Verify the **Welcome / Consent** screen appears.
3. Verify the privacy notice states data stays in the browser.
4. Verify the **Begin** button is disabled until the consent checkbox is checked.
5. Check the checkbox and click **Begin**.
6. Verify you are taken to the **Set up your habit** screen.

## 2. Random assignment

1. Clear `localStorage` and reload the page.
2. Complete consent multiple times.
3. Verify the assigned condition (shown in the tracker badge) varies across City, Garden, and Clear Day.

## 3. Researcher override

1. Append `?condition=city` to the URL, clear `localStorage`, and complete consent.
2. Verify the badge reads **City of Habits**.
3. Repeat with `?condition=garden` and `?condition=clear`.
4. Verify the researcher radio buttons on the consent screen also force a specific condition.

## 4. Habit setup validation

1. On the setup screen, leave one or more fields empty and submit.
2. Verify the form does not proceed until all three fields are filled.
3. Fill in **Observable action**, **Cue / context**, and **Minimum version**.
4. Click **Start tracking**.
5. Verify the tracker screen shows your habit in the sentence: *“I will [action] after [cue], at least [minimum].”*

## 5. Daily actions

1. Verify today’s date is shown.
2. Click **Done**.
3. Verify the status reads “Today: done ✓” and the visualization updates immediately.
4. Click **Undo**.
5. Verify the status returns to “No action recorded yet.” and the visualization reverts.
6. Click **Not today**.
7. Verify the status reads “Today: not today” and the visualization does not change.
8. Click **Undo** and then **Done** again.
9. Verify the visualization grows permanently and never decays.

## 6. Version-specific visuals

### City of Habits
- Each **Done** adds a permanent building to the city.
- Buildings should be deterministic and never disappear.

### Garden of Habits
- Each **Done** adds a permanent flower/plant to the garden.
- Plants should be deterministic and never disappear.

### Clear Day
- Each **Done** fills the next circle in a plain grid.
- The grid should never reset or decay.

## 7. Reflection feedback

1. Adjust each slider.
2. Verify the hint text updates to match the selected value (1–7).
3. Click **Save reflection**.
4. Verify the confirmation message appears.
5. Verify sliders reset to neutral (4) after saving.

## 8. Event log and export

1. Open the browser console and inspect `localStorage.habitLoopStudy_v1`.
2. Verify the stored object contains `condition`, `habit`, `history`, `feedback`, and `events`.
3. Verify each button click created an event in `events` with a timestamp and payload.
4. Click **Export JSON**.
5. Verify a `.json` file downloads containing condition, history, feedback, and events.
6. Verify the export **does not include** the free-text habit action, cue, or minimum-version fields.

## 9. Clear data

1. Click **Clear all local data**.
2. Confirm the dialog.
3. Verify the app returns to the consent screen.
4. Verify `localStorage.habitLoopStudy_v1` is removed.

## 10. Accessibility and responsiveness

1. Use the keyboard (Tab, Enter, Space) to navigate all controls.
2. Verify focus indicators are visible.
3. Test in a narrow viewport (mobile) and verify the layout stacks cleanly.
4. Enable the browser’s reduced-motion preference and verify no motion-dependent animations are required.

## 11. Prohibited elements check

Verify the prototype contains **none** of the following:
- Streak counters
- Coins / points / XP
- Leaderboards
- Progress decay or removal of old visual elements
- Guilt language
- Ads
- AI-generated content
- Social features or sharing
