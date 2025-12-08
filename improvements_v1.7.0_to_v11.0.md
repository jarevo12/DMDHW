# Summary of Improvements: v1.7.0 to v1.11.0

This document summarizes the key improvements, features, and architectural decisions made between version 1.7.0 and version 1.11.0 of the Habit Tracker application.

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
