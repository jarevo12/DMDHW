# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains two distinct projects:

1. **Habit Tracker PWA** (`habit-tracker/`) - A Progressive Web App for tracking daily habits using vanilla JavaScript and Firebase
2. **Homework Solutions** (`HW8/`) - MIT course 15.060 optimization problem solutions (LP/Integer LP formulations)

## Development Commands

### Running the Habit Tracker Locally

```bash
# Serve the habit-tracker directory (no build step required)
cd habit-tracker && python -m http.server 8000
# Or: npx http-server habit-tracker/

# Open http://localhost:8000
```

### Processing Utilities

```bash
# Split PDF documents
python split_pdf.py /path/to/pdf.pdf [pages_per_chunk]
```

## Habit Tracker Architecture

**Stack**: Vanilla JavaScript (ES6+ modules), Firebase (Firestore + Auth), Chart.js, no build system

**Module Structure**:
- `app.js` - Main controller: state management, screen routing, event delegation
- `firebase-config.js` - Firebase initialization and persistence setup
- `auth.js` - Passwordless email authentication (magic links)
- `habits.js` - Habit CRUD operations with Firestore real-time sync
- `entries.js` - Daily habit tracking and completion stats
- `dashboard.js` - Analytics, charts, and streak calculations

**Data Flow**: User actions → Module functions → Firestore → `onSnapshot` listeners → UI updates

**Firestore Structure**:
```
/users/{userId}/habits/{habitId}    # text, type (morning|evening), order
/users/{userId}/entries/{YYYY-MM-DD} # date, morning[], evening[] (completed habit IDs)
```

**External Dependencies** (loaded via CDN, no npm):
- Firebase SDK v10.7.1
- Chart.js 4.4.1

## Key Setup Notes

- Firebase credentials in `js/firebase-config.js` need updating for new deployments
- Security rules defined in `firestore.rules` - users can only access their own data
- Service worker (`sw.js`) enables offline support
- Default habits are hardcoded in `habits.js`
