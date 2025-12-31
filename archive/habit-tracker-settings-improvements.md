# Settings Tab Improvement Proposal (Organic Flow-inspired)

Date: 2025-01-06
Scope: Reimagine the `Settings` tab of `habit-tracker/index.html` to match the "Organic Flow" concept in `preview/settings_preview.html` (Everything/Morning/Evening filters + Daily/Weekly grouping). No code changes made.

## Current Baseline (Settings)
- Two static sections: "Morning Habits" and "Evening Habits" with add buttons and inline edit lists (no filtering or frequency grouping).
- Account section with email + sign out.

## Proposed Structure
- Header: keep "Settings" but add subtitle for context (e.g., "Organize habits and goals").
- Filter pills (top): `Everything`, `Morning`, `Evening` — updates the list view without navigation changes; reflect selection in ARIA (`aria-pressed`).
- Grouping blocks (cards) inside the filtered view:
  - `Daily Habits`: all habits scheduled daily for the selected slot.
  - `Weekly Goals`: habits with weekly_goal scheduling and target count shown (e.g., `3x/week`).
  - `Specific Days`: habits on selected weekdays (show chips like `Mon/Wed/Fri`).
  - `Interval / Custom`: interval-type schedules or anything else.
- Habit card layout: name, schedule summary, progress badge (streak or completions this week), edit icon/button. Use Aurora styling (soft cards, subtle shadows) consistent with `css/styles.css` rather than the beige palette shown in the preview.
- Empty states per group (e.g., "No weekly goals yet" with a CTA to add one).

## Interaction/UX Enhancements
- Quick filters: tapping `Morning/Evening` filters the dataset; `Everything` shows both grouped by schedule type. Add optional text search to narrow by name.
- Inline edit affordance: card has a single edit icon; opens the existing habit modal with prefilled data. Consider swipe-to-delete on mobile with confirm.
- Add flow: single `+ Add habit` button that opens a type selector (Morning/Evening + schedule template) before the modal. Place it near the filter pills to avoid duplication.
- Schedule clarity: show concise schedule chips on cards (e.g., `Daily`, `Weekdays`, `Every 2 days`, `3x/week`).
- Accessibility: update ARIA for tabs/pills (`role="tablist"`, `aria-selected`), ensure keyboard focus states, and use `aria-live` for success/error toasts when saving/deleting.

## Data/Logic Considerations
- Reuse existing schedule types (daily, specific_days, weekly_goal, interval) already present in the inline JS; mapping them to groups is straightforward.
- Filtering: use current habit arrays (`morning`/`evening`) and apply pill filter before rendering grouped sections.
- Progress badge: optionally pull streak from entry stats or show completions this week (requires quick query/aggregation already available for dashboard).

## Visual Treatment (match Aurora theme)
- Keep dark background; use frosted cards similar to main UI (`--glass-bg`, `--glass-border`); rounded corners akin to "Organic Flow" but with existing gradients.
- Pills: soft cards with active state using `--accent-primary`; add subtle shadow and hover/focus rings.
- Group titles: muted text color, small caps; maintain spacing consistent with `settings-section` padding.

## Delivery Steps (when implementing)
1) Replace the two static sections with a single filtered + grouped renderer (Everything/Morning/Evening pills).
2) Map habits into groups based on schedule type; render cards with name, schedule chip, edit button.
3) Add empty-state cards and a unified `+ Add habit` entry point with type preselect.
4) Wire ARIA states and keyboard navigation for pills and cards; ensure screen-reader-friendly labels (e.g., `Edit habit: <name>`).
5) Refresh CSS for pills/cards within existing theme tokens; keep bottom nav unchanged.

## Benefits
- Faster scanning by schedule type (daily vs weekly goals) while keeping the Morning/Evening mental model.
- Reduced clutter (single add button, no duplicate sections) and clearer onboarding to schedule types.
- More inviting editing surface that matches the aesthetic of the rest of the app.

## Additional Enhancements (world-class app benchmarks)
- Preference center: toggle reduced motion, high-contrast theme, larger text, haptics/sounds, and a `Show streaks` option to control motivational UI.
- Reminder/notification controls: per-habit reminders (time of day), quiet hours, weekly summary email toggle, and a `Snooze reminders` quick switch.
- Templates and duplication: prebuilt habit templates (e.g., "Morning stretch", "Hydrate"), plus duplicate habit to speed setup for similar routines.
- Bulk actions: multi-select to archive/delete habits or move them between Morning/Evening; confirm with concise summaries to prevent mistakes.
- Ordering and grouping preferences: drag-and-drop to reorder habits within Morning/Evening; allow a user-defined default filter (e.g., always open on Evening).
- Schedule presets: quick chips for common schedules (`Daily`, `Weekdays`, `Weekends`, `Mon/Wed/Fri`, `3x/week`) to reduce friction when editing.
- Data control: export habits and history (CSV/JSON); `Danger zone` with delete account/data, clearly gated by re-auth.
- Offline clarity: surface current sync state and last-sync timestamp; allow manual "Sync now" when back online.
- Support & feedback: short help section with FAQs, link to support/contact, and a `Report an issue` action that can include device info (with consent).
- Trust & privacy: brief note on where data is stored (Firebase), link to privacy policy/terms, and a toggle to opt out of analytics if added later.
