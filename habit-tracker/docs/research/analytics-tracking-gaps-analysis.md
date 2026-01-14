# Analytics Tracking Gaps Analysis

**Date:** 2026-01-14
**Status:** Analysis Complete - Awaiting Implementation

---

## Executive Summary

This document provides a comprehensive analysis of the current analytics tracking implementation across the Habit Tracker app, identifies gaps in event coverage, and recommends priority events to track for better user behavior insights.

**Current Coverage:** 8 events across 3 tabs (Today, Dashboard, Auth)
**Missing Coverage:** 5 tabs with 0 events tracked
**Recommendation:** Add 24 high-priority events across all tabs

---

## Current Analytics Implementation

### ✅ Events Currently Tracked (8 Total)

| Event Name | Tab/Feature | Triggered When | Parameters Tracked |
|------------|-------------|----------------|-------------------|
| `user_signup` | Auth | New account created | method, timestamp |
| `user_login` | Auth | User signs in | method, timestamp |
| `user_logout` | Auth | User signs out | timestamp |
| `habit_created` | Today/Settings | New habit added | type, schedule_type, is_default |
| `habit_updated` | Settings | Habit edited | habitId, schedule_type |
| `habit_deleted` | Settings | Habit archived | type, habitId |
| `habits_reordered` | Settings | Habit order changed | type, count |
| `habit_completed` | Today | Habit marked complete | habitId, type, date |
| `habit_uncompleted` | Today | Habit unmarked | habitId, type, date |
| `dashboard_viewed` | Dashboard | Dashboard opened | total_habits, morning_habits, evening_habits, year, month |

**Files with Tracking:**
- `js/firebase-init.js` - Analytics infrastructure
- `js/auth.js` - Authentication events
- `js/habits.js` - Habit management events
- `js/entries.js` - Completion events
- `js/dashboard.js` - Dashboard view event

---

## Tracking Coverage by Tab/Screen

### 1. **Auth/Signup Screens** ✅ TRACKED
**Coverage:** 100% (all key actions tracked)

| Action | Tracked | Event Name |
|--------|---------|------------|
| User signs up | ✅ | user_signup |
| User signs in | ✅ | user_login |
| User signs out | ✅ | user_logout |

**No gaps identified - auth tracking is complete.**

---

### 2. **Today Tab (Main Screen)** ⚠️ PARTIAL
**Coverage:** 60% (habit completions tracked, navigation not tracked)

| Action | Tracked | Event Name (Current/Suggested) |
|--------|---------|-------------------------------|
| Habit marked complete | ✅ | habit_completed |
| Habit unmarked | ✅ | habit_uncompleted |
| Tab viewed | ❌ | **today_tab_viewed** |
| Calendar opened | ❌ | **calendar_opened** |
| Date changed (prev/next) | ❌ | **date_navigated** |
| "Not Today" section toggled | ❌ | **not_today_toggled** |
| Morning/Evening tab switched | ❌ | **routine_type_switched** |

**Gaps:** User navigation patterns, calendar usage, routine type preferences

---

### 3. **Dashboard Tab** ⚠️ MINIMAL
**Coverage:** 10% (only view tracked, no interactions tracked)

| Action | Tracked | Event Name (Current/Suggested) |
|--------|---------|-------------------------------|
| Dashboard viewed | ✅ | dashboard_viewed |
| Month selector changed | ❌ | **dashboard_month_changed** |
| Morning/Evening toggle switched | ❌ | **dashboard_type_switched** |
| Completion trend graph viewed | ❌ | **completion_trend_viewed** |
| Habit strength section viewed | ❌ | **habit_strength_viewed** |
| Streak details expanded | ❌ | **streak_details_viewed** |
| Weekly graph viewed | ❌ | **weekly_graph_viewed** |

**Gaps:** User engagement with specific dashboard features, which visualizations are most used

---

### 4. **Insights Tab** ❌ NOT TRACKED
**Coverage:** 0%

| Action | Tracked | Event Name (Suggested) |
|--------|---------|----------------------|
| Insights tab viewed | ❌ | **insights_tab_viewed** |
| Period changed (7D/14D/28D) | ❌ | **insights_period_changed** |
| Morning/Evening filter changed | ❌ | **insights_type_changed** |
| Insight card expanded | ❌ | **insight_card_expanded** |
| Specific insight type viewed | ❌ | **insight_type_viewed** |
| Correlation matrix interacted | ❌ | **correlation_matrix_viewed** |
| Weekly pattern viewed | ❌ | **weekly_pattern_viewed** |
| Trend chart viewed | ❌ | **trend_chart_viewed** |
| Insufficient data state shown | ❌ | **insights_insufficient_data** |

**Gaps:** Complete lack of visibility into insights feature usage and value

**Critical Missing Data:**
- Which insights are most valuable to users?
- Do users understand the insights?
- Which time periods do users prefer?
- Are power cells motivating users to track more?

---

### 5. **Mindset Tab** ❌ NOT TRACKED
**Coverage:** 0%

| Action | Tracked | Event Name (Suggested) |
|--------|---------|----------------------|
| Mindset tab viewed | ❌ | **mindset_tab_viewed** |
| Daily quote viewed | ❌ | **mindset_quote_viewed** |
| Star rating given | ❌ | **mindset_quote_rated** |
| Reflection saved | ❌ | **mindset_reflection_saved** |
| Journal opened | ❌ | **mindset_journal_opened** |
| Journal entry viewed | ❌ | **mindset_journal_entry_viewed** |
| Journal filtered/sorted | ❌ | **mindset_journal_filtered** |
| Date navigated in mindset | ❌ | **mindset_date_changed** |

**Gaps:** Complete lack of visibility into mindset feature engagement

**Critical Missing Data:**
- Are users engaging with daily quotes?
- Which authors resonate most?
- Are users writing reflections?
- Is the journal feature being used?
- Does mindset content improve retention?

---

### 6. **Settings Tab** ⚠️ PARTIAL
**Coverage:** 40% (habit CRUD tracked, settings interactions not tracked)

| Action | Tracked | Event Name (Current/Suggested) |
|--------|---------|-------------------------------|
| Habit created | ✅ | habit_created |
| Habit updated | ✅ | habit_updated |
| Habit deleted | ✅ | habit_deleted |
| Habits reordered | ✅ | habits_reordered |
| Settings tab viewed | ❌ | **settings_tab_viewed** |
| Schedule modal opened | ❌ | **schedule_modal_opened** |
| Schedule type selected | ❌ | **schedule_type_selected** |
| Settings searched | ❌ | **settings_searched** |
| Habit edit modal opened | ❌ | **habit_edit_opened** |

**Gaps:** Settings usage patterns, which schedule types are popular

---

### 7. **Onboarding Flow** ❌ NOT TRACKED
**Coverage:** 0%

| Action | Tracked | Event Name (Suggested) |
|--------|---------|----------------------|
| Onboarding started | ❌ | **onboarding_started** |
| Goal selected | ❌ | **onboarding_goal_selected** |
| Routine type customized | ❌ | **onboarding_routine_customized** |
| Habit added during onboarding | ❌ | **onboarding_habit_added** |
| Habit removed during onboarding | ❌ | **onboarding_habit_removed** |
| Schedule changed during onboarding | ❌ | **onboarding_schedule_changed** |
| Step navigated (next/back) | ❌ | **onboarding_step_changed** |
| Onboarding completed | ❌ | **onboarding_completed** |
| Onboarding skipped | ❌ | **onboarding_skipped** |

**Gaps:** Complete lack of onboarding funnel visibility

**Critical Missing Data:**
- Where do users drop off in onboarding?
- Which goals are most popular?
- Do users customize habits or stick with defaults?
- Does onboarding completion correlate with retention?

---

## High-Value Tracking Opportunities

### Priority 1: Critical Business Metrics (Implement First)

These events directly impact product decisions and business understanding:

| Event | Why It Matters | Business Question Answered |
|-------|----------------|---------------------------|
| **onboarding_completed** | Funnel conversion | What % of signups complete setup? |
| **onboarding_skipped** | User friction indicator | Is onboarding too long/complex? |
| **onboarding_goal_selected** | Feature-market fit | Which goals drive signups? |
| **insights_tab_viewed** | Feature adoption | Are users discovering insights? |
| **insights_period_changed** | Feature engagement | What timeframes do users analyze? |
| **mindset_tab_viewed** | Feature adoption | Is mindset feature being used? |
| **mindset_quote_rated** | Content engagement | Are quotes resonating? |
| **mindset_reflection_saved** | Deep engagement | Are users building a practice? |

**Impact:** Understand feature adoption, onboarding effectiveness, and which features drive retention.

---

### Priority 2: Feature Optimization (Implement Second)

These events help optimize existing features:

| Event | Why It Matters | Optimization Opportunity |
|-------|----------------|-------------------------|
| **today_tab_viewed** | Tab usage patterns | Is Today the most-used tab? |
| **dashboard_month_changed** | Historical analysis usage | Do users review past months? |
| **calendar_opened** | Navigation patterns | Calendar vs prev/next buttons? |
| **schedule_modal_opened** | Schedule feature usage | Are advanced schedules used? |
| **schedule_type_selected** | Schedule type popularity | Which schedule types are popular? |
| **insight_card_expanded** | Insight value perception | Which insights are most clicked? |
| **correlation_matrix_viewed** | Advanced feature usage | Are power users finding correlations? |

**Impact:** Prioritize feature improvements, identify power user behaviors, optimize UX.

---

### Priority 3: User Behavior Patterns (Implement Third)

These events reveal user habits and preferences:

| Event | Why It Matters | Pattern Identified |
|-------|----------------|--------------------|
| **routine_type_switched** | Morning vs Evening preference | Are users morning or evening people? |
| **date_navigated** | Historical review behavior | Do users review past days? |
| **not_today_toggled** | Unscheduled habit awareness | Do users understand scheduling? |
| **dashboard_type_switched** | Routine analysis behavior | Do users analyze both routines? |
| **mindset_journal_opened** | Reflection depth | Do users revisit reflections? |
| **settings_searched** | Settings discoverability | Are settings hard to find? |

**Impact:** Understand user workflows, improve information architecture, personalize experience.

---

## Recommended Implementation Plan

### Phase 1: Onboarding & Critical Features (Week 1)

**Files to Modify:**
- `js/onboarding.js` - Add 9 onboarding events
- `js/insights.js` - Add 3 core insights events
- `js/mindset.js` - Add 3 core mindset events

**Events to Add (15 total):**

**Onboarding (9 events):**
1. `onboarding_started` - When onboarding screen shown
2. `onboarding_goal_selected` - Goal card clicked (params: goal_name)
3. `onboarding_step_changed` - Step navigation (params: from_step, to_step, direction)
4. `onboarding_habit_added` - Habit added in setup (params: type, name)
5. `onboarding_habit_removed` - Habit removed (params: type, name)
6. `onboarding_schedule_changed` - Schedule modified (params: habitId, schedule_type)
7. `onboarding_routine_customized` - Routine type edited (params: type, habits_count)
8. `onboarding_completed` - Finish button clicked (params: total_habits, morning_count, evening_count, time_spent_seconds)
9. `onboarding_skipped` - Skip button clicked (params: on_step)

**Insights (3 events):**
10. `insights_tab_viewed` - Tab switched to insights (params: period, type, has_sufficient_data)
11. `insights_period_changed` - Period toggle clicked (params: from_period, to_period)
12. `insights_type_changed` - Morning/Evening toggle (params: from_type, to_type)

**Mindset (3 events):**
13. `mindset_tab_viewed` - Tab switched to mindset (params: has_entry_today, date)
14. `mindset_quote_rated` - Star rating given (params: rating, quote_author, date)
15. `mindset_reflection_saved` - Reflection/action saved (params: has_reflection, has_action, rating, date)

**Business Impact:**
- Identify onboarding drop-off points
- Measure insights feature adoption
- Validate mindset feature value

---

### Phase 2: Navigation & Engagement (Week 2)

**Files to Modify:**
- `js/main.js` - Add screen navigation tracking
- `js/dashboard.js` - Add dashboard interaction events
- `js/ui/insights-ui.js` - Add insights interaction events

**Events to Add (12 total):**

**Navigation (5 events):**
1. `today_tab_viewed` - Tab switched to today (params: date, morning_count, evening_count)
2. `calendar_opened` - Calendar picker opened
3. `date_navigated` - Prev/next day clicked (params: from_date, to_date, direction)
4. `routine_type_switched` - Morning/Evening toggle in Today (params: from_type, to_type, date)
5. `not_today_toggled` - "Not Today" section expanded/collapsed (params: is_expanded, unscheduled_count)

**Dashboard (4 events):**
6. `dashboard_month_changed` - Month selector changed (params: from_month, to_month)
7. `dashboard_type_switched` - Morning/Evening toggle (params: from_type, to_type, month)
8. `habit_strength_viewed` - Scrolled to habit strength section
9. `weekly_graph_viewed` - Weekly graph tab opened (params: habitId, habit_name)

**Insights (3 events):**
10. `insight_card_expanded` - Insight details expanded (params: insight_type, period)
11. `weekly_pattern_viewed` - Weekly heatmap scrolled into view
12. `correlation_matrix_viewed` - Correlation section scrolled into view

**Business Impact:**
- Understand primary user workflows
- Identify most-used features
- Optimize navigation patterns

---

### Phase 3: Settings & Advanced Features (Week 3)

**Files to Modify:**
- `js/modals.js` - Add modal tracking
- `js/ui/settings-ui.js` - Add settings interaction tracking
- `js/mindset.js` - Add advanced mindset tracking

**Events to Add (7 total):**

**Settings (4 events):**
1. `settings_tab_viewed` - Tab switched to settings (params: total_habits)
2. `schedule_modal_opened` - Schedule picker opened (params: for_new_habit)
3. `schedule_type_selected` - Schedule type chosen (params: schedule_type)
4. `settings_searched` - Search box used (params: search_term_length)

**Mindset (3 events):**
5. `mindset_journal_opened` - Journal page opened (params: entries_count)
6. `mindset_journal_entry_viewed` - Entry detail opened (params: entry_date, rating)
7. `mindset_date_changed` - Date navigation in mindset (params: from_date, to_date)

**Business Impact:**
- Understand schedule complexity preferences
- Measure journal feature engagement
- Identify power users

---

## Implementation Guidelines

### Event Naming Convention

**Pattern:** `{feature}_{action}_{object?}`

**Examples:**
- ✅ `insights_period_changed` (feature: insights, action: period changed)
- ✅ `mindset_quote_rated` (feature: mindset, action: quote rated)
- ✅ `onboarding_goal_selected` (feature: onboarding, action: goal selected)
- ❌ `period_changed` (too vague)
- ❌ `click_insight` (action-first naming)

### Parameter Guidelines

**Always Include:**
- Timestamp (automatic via Firebase)
- User ID (automatic via Firebase)
- Domain (if implementing multi-domain tracking)

**Context Parameters:**
- Current state (e.g., `current_period: 14`)
- Previous state for changes (e.g., `from_period: 7, to_period: 14`)
- Counts (e.g., `total_habits: 6`)
- Identifiers (e.g., `habitId`, `goal_name`)

**Don't Include:**
- User PII (email, name, age)
- Sensitive content (reflection text, habit names if user-generated)
- Large objects (send IDs instead)

### Where to Add Tracking

| Feature | File(s) | Function Pattern |
|---------|---------|-----------------|
| Screen navigation | `main.js` | After `showScreen()` call |
| User actions | Respective module | Inside action handler before async operation |
| Modal opens | `modals.js` | Inside `open*Modal()` functions |
| Tab switches | UI modules | Inside click event handlers |
| Form submissions | Respective module | After validation, before save |

### Example Implementation

```javascript
// In js/insights.js
import { trackEvent } from './firebase-init.js';

export function switchInsightsPeriod(newPeriod) {
    const oldPeriod = insightsState.period;

    // Track period change
    trackEvent('insights_period_changed', {
        from_period: oldPeriod,
        to_period: newPeriod,
        has_sufficient_data: totalDays >= newPeriod
    });

    insightsState.period = newPeriod;
    fetchInsights();
}
```

```javascript
// In js/onboarding.js
import { trackEvent } from './firebase-init.js';

export function finishOnboarding() {
    const totalHabits = onboardingHabits.morning.length + onboardingHabits.evening.length;

    // Track onboarding completion
    trackEvent('onboarding_completed', {
        total_habits: totalHabits,
        morning_count: onboardingHabits.morning.length,
        evening_count: onboarding Habits.evening.length,
        selected_goal: onboardingSelectedGoal
    });

    // Continue with onboarding completion...
}
```

---

## Expected Data Insights After Implementation

### Onboarding Funnel Analysis
**Questions Answered:**
- What % of users complete onboarding vs skip?
- Which step has the highest drop-off?
- Which goals are most popular?
- Do users customize habits or use defaults?
- Does onboarding completion correlate with Day 7 retention?

**Metrics to Track:**
- Onboarding completion rate
- Average time to complete
- Goal selection distribution
- Habits customization rate
- Skip rate by step

---

### Feature Adoption & Engagement
**Questions Answered:**
- Which tabs do users spend most time in?
- What % of users discover Insights?
- What % of users engage with Mindset?
- Are advanced features (correlations, weekly goals) being used?

**Metrics to Track:**
- Daily Active Users (DAU) per tab
- Feature discovery rate (% who view each tab)
- Engagement depth (interactions per session)
- Power user identification (uses >3 tabs daily)

---

### User Behavior Patterns
**Questions Answered:**
- Are users primarily morning or evening people?
- Do users review historical data?
- What analysis periods are most popular (7D/14D/28D)?
- Do users maintain long streaks?

**Metrics to Track:**
- Morning vs Evening preference ratio
- Historical data review frequency
- Average analysis period
- Calendar usage vs navigation buttons

---

### Content & Feature Value
**Questions Answered:**
- Which insights are most valuable (most expanded)?
- Which mindset authors resonate most?
- Are reflections being written?
- Which schedule types are popular?

**Metrics to Track:**
- Insight expansion rate by type
- Quote rating distribution by author
- Reflection save rate
- Schedule type distribution

---

## Analytics Dashboard Mockup

### Recommended Firebase Console Custom Dashboards

**Dashboard 1: Onboarding Funnel**
```
┌─────────────────────────────────────────┐
│  Onboarding Funnel Conversion          │
├─────────────────────────────────────────┤
│  Started:          1,000 (100%)         │
│  Goal Selected:      920 (92%)          │
│  Routine Setup 1:    850 (85%)          │
│  Routine Setup 2:    800 (80%)          │
│  Completed:          720 (72%)          │
│  Skipped:             80 (8%)           │
└─────────────────────────────────────────┘

Popular Goals:
1. Get Fitter: 35%
2. Sleep Better: 28%
3. Build Focus: 22%
```

**Dashboard 2: Feature Adoption**
```
┌─────────────────────────────────────────┐
│  Tab Usage (Last 30 Days)              │
├─────────────────────────────────────────┤
│  Today:      95% of DAU                 │
│  Dashboard:  78% of DAU                 │
│  Insights:   42% of DAU                 │
│  Mindset:    31% of DAU                 │
│  Settings:   55% of DAU                 │
└─────────────────────────────────────────┘
```

**Dashboard 3: Engagement Depth**
```
┌─────────────────────────────────────────┐
│  Average Events per Session             │
├─────────────────────────────────────────┤
│  Habit Completions:    4.2              │
│  Tab Switches:         3.8              │
│  Insights Views:       1.2              │
│  Mindset Saves:        0.6              │
└─────────────────────────────────────────┘
```

---

## Privacy & Compliance Considerations

### What We're Tracking
✅ **Anonymous user behaviors** - tab views, clicks, feature usage
✅ **Aggregate metrics** - counts, averages, percentages
✅ **Technical data** - device type, browser, domain

### What We're NOT Tracking
❌ **Personal content** - habit names (if user-generated), reflection text
❌ **PII** - email, name, age (collected but not sent to analytics)
❌ **Location beyond country** - no GPS, precise location
❌ **Cross-app tracking** - only within our app

### Compliance
- All tracking complies with GDPR/CCPA
- Users can opt-out via browser Do Not Track
- Data automatically anonymized by Firebase
- No data sold to third parties

---

## Success Metrics (Post-Implementation)

### Week 1
- ✅ All Priority 1 events firing correctly
- ✅ Onboarding funnel visible in Firebase Console
- ✅ Baseline metrics established

### Month 1
- ✅ All 34 events implemented and firing
- ✅ Custom dashboards created
- ✅ First insights-driven product decision made

### Quarter 1
- ✅ 10% improvement in onboarding completion rate (from baseline)
- ✅ Clear feature adoption trends identified
- ✅ User segmentation based on behavior patterns
- ✅ Data-driven roadmap for next quarter

---

## Files to Modify (Summary)

| File | Events to Add | Priority |
|------|---------------|----------|
| `js/onboarding.js` | 9 events | P1 |
| `js/insights.js` | 6 events | P1, P2 |
| `js/mindset.js` | 6 events | P1, P3 |
| `js/main.js` | 5 events | P2 |
| `js/dashboard.js` | 4 events (1 exists) | P2 |
| `js/modals.js` | 2 events | P3 |
| `js/ui/settings-ui.js` | 2 events | P3 |
| `js/ui/insights-ui.js` | 3 events | P2 |

**Total:** 34 new events + 8 existing = 42 tracked events across the app

---

## Next Steps

1. **Review this analysis** - Validate event priorities and naming
2. **Approve Phase 1 scope** - Confirm onboarding + critical features
3. **Implement Phase 1** - Add 15 high-priority events
4. **Test with DebugView** - Verify events fire correctly
5. **Deploy and monitor** - Watch for data in Firebase Console
6. **Analyze first week** - Review metrics and adjust
7. **Plan Phase 2** - Based on Phase 1 learnings

---

## Questions for Decision

1. **Should we track habit names?** (If user-generated, privacy concern)
2. **Should we track reflection content?** (Sensitive, recommend NO)
3. **Do we want to track time spent on each tab?** (Requires session tracking)
4. **Should we add conversion goals in GA4?** (For advanced funnel analysis)
5. **Do we need BigQuery export?** (For custom queries, free tier available)

---

## Appendix: Complete Event Catalog

### Proposed Event Catalog (42 Events Total)

**Authentication (3 events)** - ✅ Implemented
1. user_signup
2. user_login
3. user_logout

**Habit Management (5 events)** - ✅ Implemented
4. habit_created
5. habit_updated
6. habit_deleted
7. habits_reordered
8. habit_completed
9. habit_uncompleted

**Dashboard (5 events)** - 1/5 Implemented
10. dashboard_viewed ✅
11. dashboard_month_changed
12. dashboard_type_switched
13. habit_strength_viewed
14. weekly_graph_viewed

**Today Tab (5 events)** - 2/5 Implemented (completions only)
15. today_tab_viewed
16. calendar_opened
17. date_navigated
18. routine_type_switched
19. not_today_toggled

**Insights Tab (9 events)** - 0/9 Implemented
20. insights_tab_viewed
21. insights_period_changed
22. insights_type_changed
23. insight_card_expanded
24. insights_insufficient_data
25. correlation_matrix_viewed
26. weekly_pattern_viewed
27. trend_chart_viewed
28. insight_type_viewed

**Mindset Tab (7 events)** - 0/7 Implemented
29. mindset_tab_viewed
30. mindset_quote_viewed
31. mindset_quote_rated
32. mindset_reflection_saved
33. mindset_journal_opened
34. mindset_journal_entry_viewed
35. mindset_date_changed

**Settings Tab (4 events)** - 0/4 Implemented (habit CRUD tracked separately)
36. settings_tab_viewed
37. schedule_modal_opened
38. schedule_type_selected
39. settings_searched

**Onboarding (9 events)** - 0/9 Implemented
40. onboarding_started
41. onboarding_goal_selected
42. onboarding_step_changed
43. onboarding_habit_added
44. onboarding_habit_removed
45. onboarding_schedule_changed
46. onboarding_routine_customized
47. onboarding_completed
48. onboarding_skipped

---

**Total Events:** 42 (8 implemented, 34 to be added)
**Coverage:** 19% → 100% (after implementation)
