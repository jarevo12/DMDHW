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

## Feature Development Workflow (MANDATORY)

**Always follow this workflow when adding new features:**

### 1. Before Starting Any Feature
```bash
git checkout main
git pull origin main
git checkout -b feature/<feature-name>
```

### 2. During Development
- Make incremental commits with clear messages
- Test changes locally before committing

### 3. Before Merging
- **Ask user for validation**: Always ask "Would you like to test this feature before I merge to main?"
- Only proceed to merge after user confirms the feature works

### 4. After User Validation
```bash
git checkout main
git merge feature/<feature-name>
git tag -a v<X.Y.Z> -m "Description of feature"
git push origin main --tags
```

### 5. Version Tagging Convention
- **Major (X.0.0)**: Breaking changes or major new functionality
- **Minor (X.Y.0)**: New features, backwards compatible
- **Patch (X.Y.Z)**: Bug fixes

### 6. If Something Breaks
```bash
git checkout <last-stable-tag>   # Roll back to stable version
git revert <bad-commit>          # Or revert specific commit
```

**Current stable version**: Tag after each successful feature merge
