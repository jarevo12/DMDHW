# Habit Tracker Changelog

This document summarizes the key improvements, features, and architectural decisions made to the Habit Tracker application.

---

## January 09, 2026 - Insights Period Selector Update & Power Cells Visualization

**Session Focus:** Refine the Insights tab period options and add an animated data collection visualization for users with insufficient tracking history.

### Period Selector Changes

Changed the period selector options from **7D/30D/90D** to **7D/14D/28D** to provide more practical time windows for habit analysis.

| Old | New | Rationale |
|-----|-----|-----------|
| 7D | 7D | Unchanged - quick snapshot |
| 30D | 14D | Two weeks is more actionable than a full month |
| 90D | 28D | Four weeks captures monthly patterns without requiring 3 months of data |

**Insight availability by period:**
- **7D:** Trend (basic), Strength
- **14D:** Trend (reliable), Strength, Weekly Pattern, Anomaly
- **28D:** ALL insights including Correlation and Sequence (require 21+ days)

### Power Cells Visualization

Added an animated "Power Cells" visualization that displays when users don't have enough data for the selected period. Previously showed a simple progress bar.

**Features:**
- 7 rows of skewed bars that fill from bottom-left based on days tracked
- Cells states: empty (dark), filled (acid green), current day (pulsing white)
- Dynamic motivational copy based on progress percentage:
  - 0-20%: "INITIATING SEQUENCE...", "SYSTEM AWAKENING"
  - 20-50%: "GATHERING MOMENTUM...", "POWER LEVELS RISING"
  - 50-80%: "CORE CHARGE AT 50%", "CONSISTENCY IS POWER"
  - 80-99%: "MAXIMUM POWER APPROACHING", "CRITICAL MASS IMMINENT"
  - 100%: "CYCLE COMPLETE", "SYSTEM OPTIMIZED"
- Grid adapts to selected period (7D=1 unit/row, 14D=2 units/row, 28D=4 units/row)
- Shows "X / Y DAYS TRACKED" subtitle

**Behavior change:** The insufficient data state now triggers when `totalDays < selectedPeriod` (instead of only when `< 7 days`). This means:
- User with 10 days selecting 7D → Shows normal insights
- User with 10 days selecting 14D → Shows power cells (10/14)
- User with 10 days selecting 28D → Shows power cells (10/28)

### Files Modified
- `js/analytics-worker.js` - Changed insufficient data check to compare against selected period
- `js/insights.js` - Pass period to worker, updated defaults from 30/90 to 14/28
- `js/ui/insights-ui.js` - Added power cells rendering functions and motivational quotes
- `css/styles.css` - Added power cells visualization styles and animations
- `index.html` - Updated period selector buttons and data notice HTML structure

---

## January 08, 2026 - Insights Tab Type Filtering Bug Fix

**Session Focus:** Fix critical bug where switching between Morning/Evening filters in the Insights tab would show incorrect habits.

### Problem
When users selected the 7D period and switched from Morning to Evening (or vice versa), the insights would continue displaying habits from the previous type selection. This issue was particularly pronounced with the 7D period but could affect all periods.

### Root Cause
Two issues were identified:

1. **Unfiltered Data in Sequence Analysis:** The `analyzeSequences()` function in `analytics-worker.js` was being called with unfiltered `matrix` and `habitIds` instead of the type-filtered `filteredMatrix` and `filteredHabitIds`. This caused sequence insights to include habits of the wrong type.

2. **Worker File Caching:** The browser aggressively cached the Web Worker file (`analytics-worker.js`), preventing updated code from being loaded even after hard refreshes.

### Solution

1. **Fixed Sequence Analysis Filtering:**
   ```javascript
   // Before (bug)
   sequences: analyzeSequences(matrix, habitIds, habitMap)

   // After (fixed)
   sequences: analyzeSequences(filteredMatrix, filteredHabitIds, habitMap)
   ```

2. **Implemented Cache-Busting for Worker:**
   Added a version parameter to the worker URL to force browsers to fetch fresh code:
   ```javascript
   insightsWorker = new Worker(`./js/analytics-worker.js?v=${CACHE_VERSION}`);
   ```

3. **Added Race Condition Protection:**
   - Implemented unique request IDs and request keys to track in-flight requests
   - Added validation to reject stale results that don't match the current filter state
   - Clear pending callbacks when a new request starts to prevent old results from being processed

4. **Immediate UI Feedback:**
   - Container is now cleared immediately when switching type/period to prevent showing stale data
   - Shows "Loading..." placeholder while new data is being fetched

### Files Modified
- `js/insights.js` - Request tracking, cache-busting, validation logic
- `js/analytics-worker.js` - Fixed sequence analysis to use filtered data
- `js/ui/insights-ui.js` - Added result type validation before rendering

---

## January 07, 2026 - Mindset Tab + Weekly Goals Dashboard

**Session Focus:** Add a Mindset tab experience and expand goal tracking for weekly/daily/interval habits.

### Updates
*   **Mindset Tab:** Added a new Mindset screen with daily quotes, author details, star rating, reflection/action prompts, and a save-to-journal flow.
*   **Mindset Journal:** Added journal list/detail views with date/author/rating filters and calendar navigation.
*   **Dashboard Weekly Goals:** Introduced weekly goal graphs and expanded the dashboard layout to surface weekly progress.
*   **Goal Calculations:** Refined daily/interval/weekly goal math and weekly-habit completion logic across Today/Dashboard views.
*   **Previews:** Added mindset tab previews and weekly-goal preview explorations.

## January 03, 2026 - Today + Dashboard UI & Analytics Refinements

**Session Focus:** Align Today/Dashboard visuals, refine habit interactions, and correct analytics logic across tabs/months.

### Updates
*   **Today & Dashboard Tabs:** Morning/Evening cards now share animated SVG icons, acid green/purple states, and dashboard tabs moved above summary cards.
*   **Habit Interactions:** Completion animation switched to slide-wipe fill with color-coded checkmarks; added habit numbering in Today and Dashboard lists.
*   **Not Today Scope:** Unscheduled habits list now respects the active tab and refreshes on tab switches/date navigation.
*   **Calendar Icon Refresh:** Replaced the Today header calendar icon with the grid-style SVG and matching strokes.
*   **Completion Trend:** Daily trend now filters by active tab, uses Morning/Evening labels, adds no-schedule overlays + legend key, and includes headroom with fixed 20% ticks.
*   **Month Persistence:** Dashboard month selection now persists across app tabs and Morning/Evening toggles.
*   **Metrics Accuracy:** Overall rate and streaks now honor selected month, active habit type, and skip unscheduled days.
*   **Habit Strength:** Scores now reflect percent of scheduled-day completions within the selected month, ordered to match Today list.

## January 03, 2026 - Motivational Audio Prep & Previews

**Session Focus:** Prepare "You vs You" audio assets and generate initial transcription output.

### Updates
*   **Audio Processing:** Converted the MP3 to a 16 kHz mono WAV and segmented it for transcription.
*   **Transcription Output:** Generated initial Whisper transcripts for the first five audio segments.
*   **Preview Assets:** Added/updated HTML previews for routine/tabs/loading/icon explorations and a new morning/evening card image.

## January 2, 2026 - Dashboard Habit Strength Update

**Session Focus:** Move Habit Strength to the Dashboard and scope scores to the selected month.

### Updates
*   **Dashboard Habit Strength:** Replaced the Completion Rates block with Habit Strength Score and removed the Habit Strength section from Insights.
*   **Per-Habit Streaks:** Added current and best streak badges for each habit in the strength list.
*   **Month-Scoped Scoring:** Strength scores now use only the selected month’s logged entries, matching insights-style calculations and avoiding empty-day penalties.
*   **Insights Callbacks:** Insights update callbacks now support multiple listeners without clobbering existing handlers.

## January 1, 2025 - Smart Insights Feature Design

**Session Focus:** Design and specification of the "Personalized Insights" killer feature - the primary differentiator for the Habit Tracker app.

### What Was Created

#### 1. Interactive Insights Preview (`previews/insights_preview.html`)
A fully interactive HTML/CSS/JS mockup showcasing the complete Insights page design:

| Section | Description |
|---------|-------------|
| **Header** | Time period toggle (7D/30D/90D) + habit type filter (ALL/AM/PM) |
| **Key Metrics Grid** | 4 summary cards: Trend %, Best Day, Most Consistent Habit, Days Analyzed |
| **Smart Insight Cards** | 5 AI-style insight types with expand/collapse functionality |
| **Weekly Pattern Heatmap** | 7-column bar chart showing completion by day of week |
| **Correlation Matrix** | Interactive grid showing habit relationships (phi coefficients) |
| **Trend Chart** | Chart.js line graph comparing morning vs evening routines |
| **Habit Strength Meters** | Progress bars with status labels (FRAGILE → MASTERED) |

**Design:** Swiss Brutalism dark theme (black bg, white 4px borders, electric purple/acid green accents)

#### 2. Technical Specification (`docs/research/smart-insights-technical-spec.md`)
Comprehensive 500+ line specification covering scalable implementation:

**Key Architecture Decision: Client-Side First**
- All statistical computation runs in browser via Web Workers
- Zero server costs for computation
- Instant insights (<100ms latency)
- Privacy-preserving (data never leaves device)
- Scales infinitely (each user's device is the "server")

**Algorithms Documented:**
- **Phi Coefficient** - Habit correlation measurement
- **Correlation Matrix** - Full n×n habit relationships
- **Day-of-Week Analysis** - Best/worst day detection
- **Trend Analysis** - Linear regression for improvement tracking
- **Anomaly Detection** - Z-score for "Super Days"
- **Habit Strength** - Decay algorithm (FRAGILE → MASTERED)
- **Sequence Analysis** - Optimal habit ordering

**Natural Language Generation:**
- Template-based NLG (25+ templates, zero API cost)
- Optional AI Coach via Gemini API (~$2/month per 1000 users)

**Implementation Timeline:** 8-12 days total

#### 3. Word Document Version (`docs/research/smart-insights-technical-spec.docx`)
Converted specification for stakeholder review.

### Key Learnings

1. **Client-side computation works everywhere** - Whether PWA, browser, or native app (via Capacitor), Web Workers and IndexedDB function identically in WebView environments.

2. **Cost efficiency** - Client-side approach costs ~$0.01/month vs $50-100/month for server-side computation.

3. **Statistical foundations** - Phi coefficient is ideal for binary habit data; minimum 21-45 days needed for reliable correlations.

### Files Added
```
habit-tracker/
├── previews/
│   └── insights_preview.html     # Interactive mockup
└── docs/research/
    ├── smart-insights-technical-spec.md    # Full specification
    └── smart-insights-technical-spec.docx  # Word version
```

---

## v2.0.0 - Modular Architecture Refactor

**Decision:** Complete refactoring from monolithic inline JavaScript to modular ES6 architecture.

*   **Context:** The application had ~2,400 lines of inline JavaScript in `index.html`, making it difficult to maintain, debug, and scale. The `js/` directory contained unused module files from an incomplete previous refactor.
*   **Outcome:** Clean, maintainable codebase with 18 ES6 modules organized by responsibility.

### Key Changes

**Code Organization:**
| Before | After |
|--------|-------|
| `index.html`: 2,861 lines (87% JS) | `index.html`: 486 lines (pure HTML) |
| Inline JS: 2,364 lines | Inline JS: 0 lines |
| 1 module used | 18 modular files |

**New Module Structure:**
```
js/
├── main.js             # Entry point, event listeners
├── firebase-init.js    # Firebase SDK initialization
├── state.js            # Centralized state management
├── constants.js        # Shared constants
├── utils.js            # Helper functions (formatDate, escapeHtml)
├── auth.js             # Authentication (magic link + password)
├── profile.js          # User profile CRUD
├── habits.js           # Habit CRUD operations
├── entries.js          # Daily entry tracking
├── schedule.js         # Schedule utilities
├── modals.js           # Modal management
├── onboarding.js       # Multi-step onboarding flow
├── dashboard.js        # Analytics and charts
├── calendar-picker.js  # Date picker component
├── routines-config.js  # Predefined habit routines
└── ui/
    ├── screens.js      # Screen management
    ├── progress.js     # Progress bar updates
    ├── habits-ui.js    # Habit list rendering
    └── settings-ui.js  # Settings page with drag-drop
```

**Benefits:**
*   **Maintainability:** Each module has a single responsibility
*   **Testability:** Modules can be tested in isolation
*   **Scalability:** Easy to add new features without touching unrelated code
*   **Developer Experience:** Clear file organization and import/export structure

---

## v1.7.0 to v1.11.0

## 1. Visual Identity Overhaul: Swiss Brutalism
**Decision:** A major strategic shift was made to move away from standard modern UI conventions to a "Swiss Brutalism" design language.
*   **Context:** The previous design was functional but generic.
*   **Outcome:** A distinct, high-impact user interface that emphasizes function and raw aesthetics.
*   **Key Changes:**
    *   **Monochrome & High Contrast:** Replaced soft colors with a strict black-and-white palette (with occasional accent colors).
    *   **Typography:** Switched to Monospace and bold Uppercase Sans fonts for a technical, data-driven look.
    *   **Geometry:** Removed all gradients, shadows, and rounded corners in favor of sharp, hard-edged containers and buttons.
    *   **Chart.js Configuration:** Updated chart visualizations to align with the sharp, monochrome theme.

## 2. Enhanced Onboarding Experience (v1.11.0)
**Decision:** The onboarding flow was reimagined to be **goal-centric** rather than just a configuration step.
*   **Context:** Users previously had to manually think of habits to add.
*   **Outcome:** A friction-free entry point where users select a goal (e.g., "Get fitter", "Sleep better") and receive a science-backed routine immediately.
*   **Key Changes:**
    *   **Goal Selection:** Introduced a new initial step where users choose a primary objective.
    *   **Predefined Routines:** Implemented a configuration engine (`routines-config.js`) that populates habit lists based on the selected goal.
    *   **Interactive Customization:** Users can now drag-and-drop to reorder habits and customize schedules during the onboarding phase.

## 3. Core Feature Improvements
Several usability gaps identified in v1.7.0 were addressed to improve day-to-day usage.

### Habit Management
*   **Drag & Drop Reordering:** Implemented the ability to reorder habit cards via drag-and-drop, both in the main dashboard and the onboarding flow.
*   **Direct Deletion:** Added a delete button to habit cards within the Settings view for quicker management.
*   **Settings "Add Habit":** Restored and fixed the functionality to add new habits directly from the Settings page.

### Navigation & Date Handling
*   **Day Navigation:** Added "Previous Day" and "Next Day" buttons to the main dashboard, allowing users to easily navigate their history without opening the calendar picker.
*   **Timezone Stability:** Fixed critical bugs related to date calculation and timezone offsets, ensuring streaks and entries map correctly to the user's local day.

## 4. Architectural Refactoring
Codebase improvements were made to support the new features and ensure scalability.

*   **Authentication Module:**
    *   Refactored `auth.js` to decouple the login and signup flows.
    *   Implemented a dedicated signup screen with improved password validation and profile creation.
*   **Settings Module:**
    *   Redesigned the `settings.js` logic to support better grouping and filtering of options.
*   **Z-Index Management:**
    *   Fixed layering issues where the Schedule Modal would appear behind the Edit Habit Modal.
