# Analytics Implementation Guide

**Last Updated:** 2026-01-14
**Domain:** axiomforgeapp.com → habit-tracker-f3c23.web.app
**Status:** ✅ Firebase Analytics Implemented and Ready for Deployment

---

## Implementation Summary

Firebase Analytics has been successfully integrated into the Habit Tracker PWA. All key user actions are now being tracked automatically.

### Files Modified
- `js/firebase-init.js` - Analytics SDK initialization and tracking functions
- `js/auth.js` - Authentication event tracking (signup, login, logout)
- `js/habits.js` - Habit management tracking (create, update, delete, reorder)
- `js/entries.js` - Habit completion tracking
- `js/dashboard.js` - Dashboard view tracking

### Events Tracked
✅ User authentication (signup, login, logout)
✅ Habit CRUD operations (create, update, delete, reorder)
✅ Daily habit completions/uncompletions
✅ Dashboard views with habit counts
✅ User ID tagging for retention analysis

### Next Steps
1. Deploy to production: `firebase deploy --only hosting`
2. Test with DebugView: Add `?debug_mode=1` to URL
3. Wait 24-48 hours for dashboard data to populate
4. Monitor weekly metrics in Firebase Console

---

## Overview

This document outlines comprehensive analytics tracking for the Habit Tracker PWA, covering user acquisition, behavior, and retention metrics.

## Analytics Stack

### 1. Firebase Analytics (Primary - Real-time Tracking)

**Purpose:** Track in-app user behavior and engagement

**Automatically Tracked:**
- Page views
- User engagement time
- Device/browser breakdown
- Geographic location
- New vs returning users
- Real-time active users
- App version tracking

**Custom Events to Track:**
- User authentication (signup/login)
- Habit creation/deletion
- Daily habit completions
- Dashboard views
- Feature usage (weekly graphs, streaks)
- Login frequency

**Access Metrics:** [Firebase Console](https://console.firebase.google.com/) → Analytics → Events/Users/Engagement

**Cost:** Free (up to 500 events tracked, unlimited reporting)

---

### 2. Firebase Authentication Metrics

**Purpose:** Monitor user signups and account activity

**Available Data:**
- Total registered users
- Sign-up dates and times
- Authentication method (email link)
- Last sign-in timestamps
- User retention over time

**Access:** Firebase Console → Authentication → Users

**Export:** CSV export available for user lists

---

### 3. Squarespace Analytics

**Purpose:** Track traffic sources and domain-level metrics

**Metrics Available:**
- Page views to .com domain (pre-redirect)
- Traffic sources (direct, search, social, referral)
- Geographic distribution
- Device types (mobile/desktop/tablet)
- Bounce rate

**Access:** Squarespace Dashboard → Analytics

**Limitation:** Only tracks initial visits to Squarespace URL before redirect to Firebase Hosting. Does not track Firebase app usage.

**Use Case:** Understanding marketing effectiveness and referral sources

---

### 4. Google Analytics 4 (GA4) - Advanced Tracking

**Purpose:** Detailed conversion funnels, campaign tracking, and custom dashboards

**Additional Capabilities:**
- UTM parameter tracking (campaign sources)
- Custom conversion goals
- User journey funnels
- Cohort analysis
- Integration with Google Ads
- BigQuery export for advanced queries
- Custom dashboards and reports

**Setup Required:**
1. Create GA4 property at [analytics.google.com](https://analytics.google.com)
2. Add tracking script to index.html
3. Configure custom events and conversions

**Use Cases:**
- Track marketing campaign performance (UTM parameters)
- Analyze user retention and churn
- Create custom conversion funnels (signup → habit creation → first completion)
- A/B testing different features

---

## Key Metrics to Monitor

### User Acquisition
- **Daily/Weekly/Monthly signups** (Firebase Auth)
- **Traffic sources** (Squarespace + GA4)
- **Geographic distribution** (Firebase Analytics)
- **Device breakdown** (Firebase Analytics)

### User Engagement
- **Daily Active Users (DAU)** (Firebase Analytics)
- **Average session duration** (Firebase Analytics)
- **Habits created per user** (Custom event)
- **Daily completion rate** (Custom event)
- **Dashboard views** (Custom event)

### User Retention
- **Day 1/7/30 retention rates** (Firebase Analytics)
- **Churn rate** (Firebase Auth - last sign-in)
- **Weekly active users (WAU)** (Firebase Analytics)
- **Feature adoption** (Custom events)

### Behavioral Metrics
- **Morning vs Evening habit preference** (Custom event)
- **Streak maintenance** (Custom event)
- **Weekly graph usage** (Custom event)
- **Average habits per user** (Firestore query)
- **Most completed habit types** (Custom event)

---

## Implementation Priority

### Phase 1: Quick Wins (5 minutes)
✅ Enable Firebase Analytics module
✅ Check Firebase Authentication metrics in console
✅ Review Squarespace Analytics dashboard

### Phase 2: Custom Event Tracking (30 minutes)
- [ ] Add Firebase Analytics SDK to project
- [ ] Implement custom events:
  - User signup/login
  - Habit CRUD operations
  - Daily completions
  - Dashboard views
  - Feature usage

### Phase 3: Advanced Analytics (1-2 hours)
- [ ] Set up Google Analytics 4 property
- [ ] Configure UTM tracking for campaigns
- [ ] Create custom conversion funnels
- [ ] Set up automated reports/alerts

---

## Custom Events Schema

### Authentication Events
```javascript
trackEvent('user_signup', {
  method: 'email_link',
  timestamp: Date.now()
});

trackEvent('user_login', {
  method: 'email_link',
  returning_user: true
});
```

### Habit Management Events
```javascript
trackEvent('habit_created', {
  type: 'morning' | 'evening',
  is_default: false
});

trackEvent('habit_deleted', {
  type: 'morning' | 'evening',
  had_completions: true
});

trackEvent('habit_reordered', {
  type: 'morning' | 'evening'
});
```

### Completion Events
```javascript
trackEvent('habit_completed', {
  habitId: 'abc123',
  type: 'morning' | 'evening',
  date: 'YYYY-MM-DD',
  is_streak: true
});

trackEvent('daily_completion', {
  date: 'YYYY-MM-DD',
  morning_count: 3,
  evening_count: 2,
  total_count: 5,
  completion_rate: 0.83
});
```

### Feature Usage Events
```javascript
trackEvent('dashboard_viewed', {
  total_habits: 6,
  active_streak: 5
});

trackEvent('weekly_graph_viewed', {
  week_start: 'YYYY-MM-DD'
});
```

---

## Data Privacy Considerations

### Firebase Analytics
- Automatically anonymizes IP addresses
- Does not collect personally identifiable information (PII)
- Compliant with GDPR/CCPA
- Users can opt-out via browser settings

### Recommended Privacy Policy Updates
When implementing analytics, update your privacy policy to disclose:
1. Use of Firebase Analytics for app improvement
2. Types of data collected (device info, usage patterns)
3. Data retention policies
4. Third-party services (Google Analytics)
5. User opt-out options

---

## Monitoring Dashboards

### Firebase Console - Daily Check
- Real-time active users
- Daily signups
- Top events
- Crash reports (if Firebase Crashlytics added)

### Weekly Review
- User retention curves
- Feature adoption rates
- Completion trends
- Geographic growth

### Monthly Analysis
- Month-over-month growth
- Churn analysis
- Feature effectiveness
- Campaign ROI (if running ads)

---

## Troubleshooting

### Firebase Analytics not showing data
1. Check that `getAnalytics()` is called after `initializeApp()`
2. Verify measurement ID in Firebase Console → Project Settings
3. Data can take 24 hours to appear in reports (use DebugView for real-time)
4. Check browser console for errors

### GA4 tracking not working
1. Verify GA4 measurement ID is correct
2. Check that gtag.js script loads (Network tab)
3. Use GA4 DebugView for real-time validation
4. Disable ad blockers during testing

### Discrepancies between analytics platforms
- Firebase Analytics: Tracks app sessions
- Squarespace: Tracks domain visits (pre-redirect)
- GA4: Tracks pageviews and custom events
- Different platforms have different session definitions

---

## Tracking Multiple Domains

### Question: Does Firebase Track Both Domains?

**YES!** Firebase Analytics will track users from both:
- ✅ `https://habit-tracker-f3c23.web.app/` (Firebase Hosting URL)
- ✅ `https://axiomforgeapp.com/` (Custom domain)

Both domains serve the same Firebase app, so all analytics events are collected in one place.

### How to Differentiate Traffic Between Domains

Firebase Analytics **automatically tracks the hostname** for every session. Here's how to view it:

#### Method 1: Built-in Hostname Tracking (No Code Changes)

1. Go to Firebase Console → Analytics → **Events**
2. Select any event (e.g., `user_login`)
3. Click **View Event Parameters**
4. Look for the **`page_location`** parameter - this contains the full URL including domain

**Example Data:**
```
page_location: "https://axiomforgeapp.com/"
page_location: "https://habit-tracker-f3c23.web.app/"
```

#### Method 2: Create Custom User Property (Recommended)

Track which domain each user first visited from as a permanent user property:

**Add to `js/firebase-init.js`:**

```javascript
// Add after analytics initialization (line 79)
export async function initializeFirebase() {
    // ... existing code ...

    analytics = getAnalytics(app);

    // Track entry domain as user property
    const entryDomain = window.location.hostname;
    setUserProperties(analytics, {
        entry_domain: entryDomain,
        entry_url: window.location.href
    });

    console.log('Firebase Analytics initialized');
    console.log('Entry domain tracked:', entryDomain);

    // ... rest of code ...
}
```

**Benefits:**
- Every user is tagged with their entry domain
- View reports segmented by domain
- Compare retention rates between domains
- See which domain drives more engaged users

#### Method 3: Track Domain in Every Event

Add domain to each event's parameters:

**Modify `trackEvent()` in `js/firebase-init.js`:**

```javascript
export function trackEvent(eventName, params = {}) {
    if (!analytics) {
        console.warn('Analytics not initialized yet');
        return;
    }

    try {
        // Add domain to every event
        const enrichedParams = {
            ...params,
            domain: window.location.hostname
        };

        logEvent(analytics, eventName, enrichedParams);
        console.log(`Analytics: ${eventName}`, enrichedParams);
    } catch (error) {
        console.error('Error tracking event:', error);
    }
}
```

**Example Event Data:**
```javascript
{
  event: "habit_created",
  type: "morning",
  domain: "axiomforgeapp.com"  // ← Automatically added
}
```

### Viewing Domain Reports in Firebase Console

#### Option 1: Filter by Domain
1. Go to Analytics → **Events**
2. Click any event → **View Event Parameters**
3. Click **"page_location"** parameter
4. See breakdown by URL/domain

#### Option 2: Custom Dimension (Advanced)
1. Go to Analytics → **Custom Definitions**
2. Create custom dimension: `entry_domain`
3. Use in any report to segment by domain

#### Option 3: BigQuery Export (Free Tier)
1. Go to Project Settings → **Integrations** → **BigQuery**
2. Enable free daily export
3. Run SQL queries like:

```sql
SELECT
  user_properties.value.string_value AS entry_domain,
  COUNT(DISTINCT user_pseudo_id) AS users,
  COUNT(*) AS events
FROM `your-project.analytics_YYYYMMDD.events_*`
WHERE event_name = 'user_signup'
GROUP BY entry_domain
```

---

## Squarespace vs Firebase Analytics

### Squarespace Analytics (axiomforgeapp.com)

**Tracks:**
- Initial page visits to `axiomforgeapp.com` (before redirect)
- Traffic sources (Google search, social media, direct)
- Geographic data
- Device types

**Limitation:** Only tracks the landing page, not in-app behavior

### Firebase Analytics

**Tracks:**
- All in-app behavior (both domains)
- User actions (habits created, completed, etc.)
- Session duration
- User retention

### Combined View

**Best Practice:**
1. Use **Squarespace Analytics** to see where users discover your app
2. Use **Firebase Analytics** to see what they do after arriving
3. Compare domains to see which one drives more conversions

**Example Insight:**
- Squarespace shows: "500 visitors from Google to axiomforgeapp.com"
- Firebase shows: "400 of those created accounts, 300 created habits"
- Conversion rate: 60% from .com domain

---

## Future Enhancements

### Potential Additions
- [ ] Firebase Crashlytics (error monitoring)
- [ ] Firebase Performance Monitoring (load times)
- [ ] Hotjar/FullStory (session recordings)
- [ ] Mixpanel (product analytics)
- [ ] Custom admin dashboard for aggregated metrics

### Advanced Queries
- User cohort analysis (signup month vs retention)
- Habit completion patterns by time of day
- Correlation between habit count and retention
- Most engaging habit types

---

## Resources

- [Firebase Analytics Documentation](https://firebase.google.com/docs/analytics)
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [Squarespace Analytics](https://support.squarespace.com/hc/en-us/articles/205815928-Using-Analytics)
- [Privacy Policy Generator](https://www.freeprivacypolicy.com/)

---

## Notes

- Analytics implementation should not impact app performance
- All tracking is opt-out compliant with browser Do Not Track settings
- Regular review of metrics helps prioritize feature development
- A/B testing requires GA4 + Firebase Remote Config integration
