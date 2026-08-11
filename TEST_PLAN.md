# City of Habits — Manual Acceptance Test Plan

Run the app from `web/` with `python3 -m http.server 8000`. Use a fresh browser profile or clear the `cityOfHabits_v1` localStorage key before the first test.

## Fresh start and onboarding

1. Load the page and verify it presents City of Habits, not a research study or concept test.
2. Complete the initial setup with a title, cue, minimum version, cadence, and district.
3. Verify the new habit appears in Today and in the city/district view.
4. Reload. Verify the habit and setup state persist.

## Daily loop

1. Mark a scheduled habit **Done**.
2. Verify its status changes immediately, the textual city summary updates, and the city gains a permanent visual detail.
3. Mark **Undo**. Verify only today's action is reverted and the city returns to its prior derived state.
4. Mark **Not today**. Verify no city element is removed and no punitive copy appears.
5. Verify that habits with cadences not scheduled for the current day are hidden from Today, with no overdue or punitive state.
6. Reload after each state; verify persistence.

## Multiple habits and management

1. Add two more habits with different districts/cadences.
2. Verify each habit can be marked independently and each contributes to the appropriate district.
3. Edit one habit's cue/minimum version and verify the update persists.
4. Pause and resume a habit. Verify paused habits are clearly labelled, are removed from Today and the weekly active list, and can be resumed from Habits or Atlas; verify history and city contributions remain.
5. Archive a habit. Verify its historic city contribution remains while it leaves active Today.

## Weekly recovery

1. Open the weekly check-in after creating a habit.
2. Select each option: Keep, Make it smaller, Change cue, Pause.
3. For **Keep**, verify the choice and any note persist.
4. For **Make it smaller**, edit the minimum version, verify it persists on the habit and in Today.
5. For **Change cue**, edit the cue, verify it persists on the habit and in Today.
6. For **Pause**, verify the habit disappears from Today and the weekly active list, appears labelled as paused, and can be resumed.
7. Add a note without choosing an option; verify it is saved and can be exported/imported.
8. Verify no streak, decay, missed-day penalty, XP, coins, score, or leaderboard appears.

## City and accessibility

1. Navigate city districts using keyboard and confirm active/selected states are visible.
2. Verify all buttons have visible focus and all controls are usable with Tab, Enter, and Space.
3. Open the New/Edit habit modal with the keyboard, then press Tab, Shift+Tab, and Escape; verify focus cycles within the modal when open and returns to the opener when closed.
4. Verify the city has a meaningful textual alternative summary independent of visual inspection.
4. Enable reduced motion and mark a habit Done; verify no interaction relies on animation.
5. Test 390px-wide and 320px-wide viewports: navigation, dialogs, city controls, and forms remain usable.

## Local backup and restoration

1. Create at least one habit and completion event.
2. Click Export backup and verify a JSON file is downloaded.
3. Clear local City of Habits data through the settings action, then import the backup.
4. Confirm restore and verify habits/completions/city return.
5. Attempt to import malformed JSON, a backup with unknown cadence/district, and a backup with history referencing missing habit IDs; verify each is rejected without altering existing state.
6. Export a backup containing a note-only weekly entry, then import it; verify the note-only entry is accepted and restored.
7. Confirm the UI states backups are private because they contain habit content.

## Browser checks

1. Open the DevTools console during a fresh load and primary flow; verify zero application errors.
2. Verify `/`, `app.js`, and `styles.css` return HTTP 200 from the local static server.
3. Verify no network requests go to third parties.
