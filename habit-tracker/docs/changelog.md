# Habit Tracker Changelog

This document summarizes the key improvements, features, and architectural decisions made to the Habit Tracker application.

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
