// ========== CENTRALIZED STATE MANAGEMENT ==========
// All application state in one place for easy access across modules

// Firebase instances
export let app = null;
export let db = null;
export let auth = null;

// User state
export let currentUser = null;
export let accountCreatedAt = null;

// Habits state
export let habits = { morning: [], evening: [] };

// Current view state
export let currentDate = new Date();
export let currentTab = 'morning';
export let currentEntry = null;

// Subscription cleanup functions
export let unsubscribeHabits = null;
export let unsubscribeEntry = null;

// Calendar state
export let calendarState = {
    isOpen: false,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    entriesData: {}
};

// Settings state
export let settingsFilter = 'all';
export let settingsSearch = '';

// Onboarding state
export let onboardingStep = 1;
export let onboardingHabits = { morning: [], evening: [] };
export let onboardingSelectedGoal = null;

// Dashboard state
export let dashboardMonth = {
    year: new Date().getFullYear(),
    month: new Date().getMonth()
};

// Schedule modal state
export let currentScheduleCallback = null;
export let currentScheduleHabit = null;

// ========== STATE SETTERS ==========
// Use these functions to update state from other modules

export function setFirebaseInstances(appInstance, dbInstance, authInstance) {
    app = appInstance;
    db = dbInstance;
    auth = authInstance;
}

export function setCurrentUser(user) {
    currentUser = user;
}

export function setAccountCreatedAt(createdAt) {
    accountCreatedAt = createdAt;
}

export function setHabits(newHabits) {
    habits = newHabits;
}

export function setCurrentDate(date) {
    currentDate = date;
}

export function setCurrentTab(tab) {
    currentTab = tab;
}

export function setCurrentEntry(entry) {
    currentEntry = entry;
}

export function setUnsubscribeHabits(fn) {
    unsubscribeHabits = fn;
}

export function setUnsubscribeEntry(fn) {
    unsubscribeEntry = fn;
}

export function setCalendarState(newState) {
    calendarState = { ...calendarState, ...newState };
}

export function setSettingsFilter(filter) {
    settingsFilter = filter;
}

export function setSettingsSearch(search) {
    settingsSearch = search;
}

export function setDashboardMonth(year, month) {
    dashboardMonth = { year, month };
}

export function setOnboardingStep(step) {
    onboardingStep = step;
}

export function setOnboardingHabits(newHabits) {
    onboardingHabits = newHabits;
}

export function setOnboardingSelectedGoal(goal) {
    onboardingSelectedGoal = goal;
}

export function setCurrentScheduleCallback(callback) {
    currentScheduleCallback = callback;
}

export function setCurrentScheduleHabit(habit) {
    currentScheduleHabit = habit;
}

// ========== STATE GETTERS ==========
// For convenience, provide getter functions for complex state

export function getCalendarEntriesData() {
    return calendarState.entriesData;
}

export function updateCalendarEntriesData(dateString, data) {
    calendarState.entriesData[dateString] = data;
}

export function resetOnboardingState() {
    onboardingStep = 1;
    onboardingHabits = { morning: [], evening: [] };
    onboardingSelectedGoal = null;
}
