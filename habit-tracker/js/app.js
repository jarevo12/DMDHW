// Main Application Controller
import { initializeFirebase, isFirebaseConfigured } from './firebase-config.js';
import { initAuth, sendMagicLink, logOut, addAuthListener, getUserInfo } from './auth.js';
import { initHabits, subscribeToHabits, getHabits, addHabit, updateHabit, deleteHabit, initializeDefaultHabits } from './habits.js';
import { initEntries, subscribeToEntry, toggleHabit, formatDate, getTodayString, getCompletionStats } from './entries.js';
import { initDashboard, renderDashboard, setMonth, setType } from './dashboard.js';
import { initProfile, getUserProfile, hasCompletedOnboarding } from './profile.js';
import { initOnboarding, initializeOnboarding, goToNextStep, goToPreviousStep, skipToReview } from './onboarding.js';
import { getScheduledHabitsForDate, getUnscheduledHabitsForDate, getScheduleLabel } from './schedule.js';
import {
    openHabitModal, closeHabitModal, openDeleteModal, closeDeleteModal,
    getHabitToEdit, getHabitToDelete,
    openScheduleModal, closeScheduleModal, getScheduleCallback,
    renderScheduleOptions, getScheduleFromModal
} from './modals.js';
import { initCalendarPicker, toggleCalendar, renderCalendar, navigateToPreviousMonth, navigateToNextMonth } from './calendar-picker.js';

// App state
const state = {
    currentScreen: 'loading',
    currentView: 'today',
    currentTab: 'morning',
    currentDate: new Date(),
    habits: { morning: [], evening: [] },
    entry: null,
    user: null,
    unsubscribeHabits: null,
    unsubscribeEntry: null
};

// DOM Elements cache
const elements = {};

// Calendar state
const calendarState = {
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    isOpen: false,
    entriesData: {}
};

// Initialize app
async function init() {
    console.log('Initializing Habit Tracker...');

    // Cache DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Check if Firebase is configured
    if (!isFirebaseConfigured()) {
        showConfigurationRequired();
        return;
    }

    try {
        // Initialize Firebase
        await initializeFirebase();

        // Initialize modules
        await Promise.all([
            initHabits(),
            initEntries(),
            initProfile(),
            initOnboarding(),
            initCalendarPicker()
        ]);

        // Initialize dashboard
        await initDashboard();

        // Initialize auth and wait for auth state
        await initAuth();

        // Set up auth listener
        addAuthListener(handleAuthStateChange);

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize app. Please refresh the page.');
    }
}

// Cache DOM elements
function cacheElements() {
    elements.loadingScreen = document.getElementById('loading-screen');
    elements.authScreen = document.getElementById('auth-screen');
    elements.onboardingScreen = document.getElementById('onboarding-screen');
    elements.mainScreen = document.getElementById('main-screen');
    elements.dashboardScreen = document.getElementById('dashboard-screen');
    elements.settingsScreen = document.getElementById('settings-screen');

    elements.authForm = document.getElementById('auth-form');
    elements.emailInput = document.getElementById('email-input');
    elements.authMessage = document.getElementById('auth-message');
    elements.sentEmail = document.getElementById('sent-email');
    elements.authError = document.getElementById('auth-error');
    elements.tryAgain = document.getElementById('try-again');

    elements.currentDate = document.getElementById('current-date');
    elements.toggleCalendar = document.getElementById('toggle-calendar');
    elements.todayShortcut = document.getElementById('today-shortcut');
    elements.calendarPicker = document.getElementById('calendar-picker');
    elements.prevMonth = document.getElementById('prev-month');
    elements.nextMonth = document.getElementById('next-month');
    elements.calendarMonthYear = document.getElementById('calendar-month-year');
    elements.calendarDays = document.getElementById('calendar-days');

    elements.tabBtns = document.querySelectorAll('.tab-btn');
    elements.morningHabits = document.getElementById('morning-habits');
    elements.eveningHabits = document.getElementById('evening-habits');

    elements.progressFill = document.getElementById('progress-fill');
    elements.progressText = document.getElementById('progress-text');

    elements.navBtns = document.querySelectorAll('.nav-btn');

    elements.monthSelector = document.getElementById('month-selector');
    elements.dashTabs = document.querySelectorAll('.dash-tab');

    elements.editMorningHabits = document.getElementById('edit-morning-habits');
    elements.editEveningHabits = document.getElementById('edit-evening-habits');
    elements.addMorningHabit = document.getElementById('add-morning-habit');
    elements.addEveningHabit = document.getElementById('add-evening-habit');
    elements.userEmail = document.getElementById('user-email');
    elements.logoutBtn = document.getElementById('logout-btn');

    elements.habitModal = document.getElementById('habit-modal');
    elements.habitForm = document.getElementById('habit-form');
    elements.habitId = document.getElementById('habit-id');
    elements.habitType = document.getElementById('habit-type');
    elements.habitName = document.getElementById('habit-name');
    elements.modalTitle = document.getElementById('modal-title');
    elements.cancelHabit = document.getElementById('cancel-habit');

    elements.deleteModal = document.getElementById('delete-modal');
    elements.cancelDelete = document.getElementById('cancel-delete');
    elements.confirmDelete = document.getElementById('confirm-delete');

    elements.offlineIndicator = document.getElementById('offline-indicator');
}

// Set up event listeners
function setupEventListeners() {
    // Auth form
    elements.authForm?.addEventListener('submit', handleAuthSubmit);
    elements.tryAgain?.addEventListener('click', handleTryAgain);

    // Calendar navigation
    elements.toggleCalendar?.addEventListener('click', handleToggleCalendar);
    elements.todayShortcut?.addEventListener('click', goToToday);
    elements.prevMonth?.addEventListener('click', () => {
        navigateToPreviousMonth();
        renderCalendar(state.currentDate, state.habits);
    });
    elements.nextMonth?.addEventListener('click', () => {
        navigateToNextMonth();
        renderCalendar(state.currentDate, state.habits);
    });

    // Tab navigation
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => handleTabChange(btn.dataset.tab));
    });

    // Bottom navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => handleViewChange(btn.dataset.view));
    });

    // Dashboard
    elements.monthSelector?.addEventListener('change', handleMonthChange);
    elements.dashTabs.forEach(btn => {
        btn.addEventListener('click', () => handleDashTypeChange(btn.dataset.type));
    });

    // Settings
    elements.addMorningHabit?.addEventListener('click', () => openHabitModal(null, 'morning'));
    elements.addEveningHabit?.addEventListener('click', () => openHabitModal(null, 'evening'));
    elements.logoutBtn?.addEventListener('click', handleLogout);

    // Habit modal
    elements.habitForm?.addEventListener('submit', handleHabitSubmit);
    elements.cancelHabit?.addEventListener('click', closeHabitModal);
    elements.habitModal?.querySelector('.modal-overlay')?.addEventListener('click', closeHabitModal);

    // Delete modal
    elements.cancelDelete?.addEventListener('click', closeDeleteModal);
    elements.deleteModal?.querySelector('.modal-overlay')?.addEventListener('click', closeDeleteModal);

    // Onboarding navigation
    document.getElementById('onboarding-next')?.addEventListener('click', goToNextStep);
    document.getElementById('onboarding-back')?.addEventListener('click', goToPreviousStep);
    document.getElementById('onboarding-skip')?.addEventListener('click', skipToReview);

    // Schedule modal
    const scheduleModal = document.getElementById('schedule-modal');
    scheduleModal?.querySelector('.modal-overlay')?.addEventListener('click', closeScheduleModal);
    document.getElementById('cancel-schedule')?.addEventListener('click', closeScheduleModal);
    document.getElementById('save-schedule')?.addEventListener('click', () => {
        const schedule = getScheduleFromModal();
        const callback = getScheduleCallback();
        if (callback) {
            callback(schedule);
        }
        closeScheduleModal();
    });

    // Schedule type buttons
    document.querySelectorAll('.schedule-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.schedule-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const schedule = {type: btn.dataset.type};
            renderScheduleOptions(schedule);
        });
    });

    // Habit schedule button (in habit modal)
    document.getElementById('habit-schedule-btn')?.addEventListener('click', () => {
        const habitToEdit = getHabitToEdit();
        const currentSchedule = habitToEdit?.schedule || {type: 'daily'};
        openScheduleModal({schedule: currentSchedule}, (newSchedule) => {
            document.getElementById('habit-schedule').value = JSON.stringify(newSchedule);
            document.getElementById('habit-schedule-btn').textContent = getScheduleLabel(newSchedule);
        });
    });

    // Offline detection
    window.addEventListener('online', () => {
        elements.offlineIndicator?.classList.add('hidden');
    });
    window.addEventListener('offline', () => {
        elements.offlineIndicator?.classList.remove('hidden');
    });
}

// Handle auth state changes
async function handleAuthStateChange(user) {
    state.user = user;

    if (user) {
        console.log('User signed in:', user.email);

        // Check if user has completed onboarding
        const profile = await getUserProfile();

        if (!hasCompletedOnboarding(profile)) {
            // New user - show onboarding
            console.log('New user - starting onboarding');
            showScreen('onboarding');
            initializeOnboarding(() => {
                // Onboarding complete callback
                console.log('Onboarding completed');
                // Subscribe to data and show main screen
                state.unsubscribeHabits = subscribeToHabits(handleHabitsUpdate);
                subscribeToCurrentDate();
                showScreen('main');
                updateDateDisplay();
            });
            return;
        }

        // Existing user - normal flow
        // Subscribe to habits
        state.unsubscribeHabits = subscribeToHabits(handleHabitsUpdate);

        // Subscribe to today's entry
        subscribeToCurrentDate();

        // Show main screen
        showScreen('main');
        updateDateDisplay();

    } else {
        console.log('User signed out');

        // Clean up subscriptions
        if (state.unsubscribeHabits) {
            state.unsubscribeHabits();
            state.unsubscribeHabits = null;
        }
        if (state.unsubscribeEntry) {
            state.unsubscribeEntry();
            state.unsubscribeEntry = null;
        }

        // Show auth screen
        showScreen('auth');
    }
}

// Handle auth form submission
async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = elements.emailInput.value.trim();
    if (!email) return;

    const submitBtn = elements.authForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Sending...</span>';

    try {
        await sendMagicLink(email);

        // Show success message
        elements.authForm.classList.add('hidden');
        elements.authMessage.classList.remove('hidden');
        elements.sentEmail.textContent = email;
        elements.authError.classList.add('hidden');

    } catch (error) {
        console.error('Auth error:', error);
        elements.authError.textContent = getAuthErrorMessage(error);
        elements.authError.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Magic Link</span>';
    }
}

// Handle try again
function handleTryAgain() {
    elements.authForm.classList.remove('hidden');
    elements.authMessage.classList.add('hidden');
    elements.emailInput.value = '';
    elements.emailInput.focus();
}

// Handle habits update
function handleHabitsUpdate(habits) {
    state.habits = habits;
    renderHabits();
    renderEditableHabits();
    updateProgress();
}

// Handle entry update
function handleEntryUpdate(entry) {
    state.entry = entry;
    updateHabitCheckmarks();
    updateProgress();
}

// Subscribe to current date entry
function subscribeToCurrentDate() {
    if (state.unsubscribeEntry) {
        state.unsubscribeEntry();
    }

    const dateString = formatDate(state.currentDate);
    state.unsubscribeEntry = subscribeToEntry(dateString, handleEntryUpdate);
}

// Navigate date
function navigateDate(direction) {
    const newDate = new Date(state.currentDate);
    newDate.setDate(newDate.getDate() + direction);

    // Don't allow future dates
    if (newDate > new Date()) return;

    state.currentDate = newDate;
    updateDateDisplay();
    subscribeToCurrentDate();
}

// Update date display
function updateDateDisplay() {
    const today = new Date();
    const isToday = formatDate(state.currentDate) === formatDate(today);

    const dateText = elements.currentDate.querySelector('.date-text');
    const dateFull = elements.currentDate.querySelector('.date-full');

    if (isToday) {
        dateText.textContent = 'Today';
    } else {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (formatDate(state.currentDate) === formatDate(yesterday)) {
            dateText.textContent = 'Yesterday';
        } else {
            dateText.textContent = state.currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        }
    }

    dateFull.textContent = state.currentDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Update calendar if open
    if (calendarState.isOpen) {
        renderCalendar(state.currentDate, state.habits);
    }
}

// Toggle calendar
function handleToggleCalendar() {
    toggleCalendar(state.currentDate, (newDate) => {
        state.currentDate = newDate;
        updateDateDisplay();
        subscribeToCurrentDate();
    });

    // After calendar opens, render it with current habits
    if (!elements.calendarPicker.classList.contains('hidden')) {
        renderCalendar(state.currentDate, state.habits);
    }
}

// Go to today
function goToToday() {
    state.currentDate = new Date();
    updateDateDisplay();
    subscribeToCurrentDate();

    // Close calendar if open
    if (calendarState.isOpen) {
        toggleCalendar();
    }
}

// Navigate calendar month (removed - using imported functions)

// Select date from calendar
function selectDate(dateString) {
    state.currentDate = new Date(dateString);
    updateDateDisplay();
    subscribeToCurrentDate();

    // Close calendar
    if (calendarState.isOpen) {
        toggleCalendar();
    }
}

// Handle tab change
function handleTabChange(tab) {
    state.currentTab = tab;

    // Update tab buttons
    elements.tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update habit lists
    elements.morningHabits.classList.toggle('active', tab === 'morning');
    elements.eveningHabits.classList.toggle('active', tab === 'evening');

    updateProgress();
}

// Handle view change
function handleViewChange(view) {
    state.currentView = view;

    // Update all nav buttons across screens
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Show appropriate screen
    if (view === 'today') {
        showScreen('main');
    } else if (view === 'dashboard') {
        showScreen('dashboard');
        renderDashboard();
    } else if (view === 'settings') {
        showScreen('settings');
        updateSettingsScreen();
    }
}

// Handle month change in dashboard
async function handleMonthChange(e) {
    const [year, month] = e.target.value.split('-').map(Number);
    await setMonth(year, month);
    renderDashboard();
}

// Handle dashboard type change
async function handleDashTypeChange(type) {
    elements.dashTabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    setType(type);

    // Re-render habit rates
    const { renderHabitRates } = await import('./dashboard.js');
    renderHabitRates('habit-rates');
}

// Render habits list
function renderHabits() {
    const dateString = formatDate(state.currentDate);
    const scheduledHabits = getScheduledHabitsForDate(state.habits, dateString);
    const unscheduledHabits = getUnscheduledHabitsForDate(state.habits, dateString);

    // Render scheduled habits
    renderHabitList(elements.morningHabits, scheduledHabits.morning, 'morning');
    renderHabitList(elements.eveningHabits, scheduledHabits.evening, 'evening');

    // TODO: Render "Not Today" section for unscheduled habits
    // This would require adding a UI element for unscheduled habits
}

// Render single habit list
function renderHabitList(container, habits, type) {
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${type === 'morning' ? '🌅' : '🌙'}</div>
                <p>No ${type} habits yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = habits.map(habit => `
        <div class="habit-item" data-id="${habit.id}" data-type="${type}">
            <div class="habit-checkbox"></div>
            <span class="habit-name">${escapeHtml(habit.name)}</span>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.habit-item').forEach(item => {
        item.addEventListener('click', () => handleHabitToggle(item));
    });

    updateHabitCheckmarks();
}

// Handle habit toggle
async function handleHabitToggle(item) {
    const habitId = item.dataset.id;
    const type = item.dataset.type;
    const dateString = formatDate(state.currentDate);

    // Add animation class
    item.classList.add('completing');

    try {
        const isCompleted = await toggleHabit(dateString, habitId, type);
        item.classList.toggle('completed', isCompleted);
    } catch (error) {
        console.error('Toggle error:', error);
    }

    // Remove animation class
    setTimeout(() => {
        item.classList.remove('completing');
    }, 300);
}

// Update habit checkmarks based on entry
function updateHabitCheckmarks() {
    if (!state.entry) return;

    document.querySelectorAll('.habit-item').forEach(item => {
        const habitId = item.dataset.id;
        const type = item.dataset.type;
        const completedHabits = state.entry[type] || [];
        item.classList.toggle('completed', completedHabits.includes(habitId));
    });
}

// Update progress bar
function updateProgress() {
    const habits = state.habits[state.currentTab] || [];
    const completedHabits = state.entry?.[state.currentTab] || [];

    const total = habits.length;
    const completed = habits.filter(h => completedHabits.includes(h.id)).length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${completed}/${total} completed`;
}

// Render editable habits in settings
function renderEditableHabits() {
    renderEditableHabitList(elements.editMorningHabits, state.habits.morning, 'morning');
    renderEditableHabitList(elements.editEveningHabits, state.habits.evening, 'evening');
}

// Render single editable habit list
function renderEditableHabitList(container, habits, type) {
    if (!container) return;

    if (habits.length === 0) {
        container.innerHTML = '<p class="text-muted">No habits</p>';
        return;
    }

    container.innerHTML = habits.map(habit => `
        <div class="edit-habit-item" data-id="${habit.id}">
            <span class="drag-handle">☰</span>
            <span class="edit-habit-name">${escapeHtml(habit.name)}</span>
            <div class="edit-habit-actions">
                <button class="edit-btn edit" data-id="${habit.id}" data-type="${type}" title="Edit">✎</button>
                <button class="edit-btn delete" data-id="${habit.id}" title="Delete">×</button>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.edit-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const habit = state.habits[btn.dataset.type].find(h => h.id === btn.dataset.id);
            if (habit) openHabitModal(habit, btn.dataset.type);
        });
    });

    container.querySelectorAll('.edit-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
    });
}

// Update settings screen
function updateSettingsScreen() {
    const userInfo = getUserInfo();
    if (userInfo && elements.userEmail) {
        elements.userEmail.textContent = userInfo.email || 'Not signed in';
    }
    renderEditableHabits();
}

// Handle habit form submission
async function handleHabitSubmit(e) {
    e.preventDefault();

    const id = elements.habitId.value;
    const type = elements.habitType.value;
    const name = elements.habitName.value.trim();

    if (!name) return;

    try {
        if (id) {
            await updateHabit(id, { name });
        } else {
            await addHabit(name, type);
        }
        closeHabitModal();
    } catch (error) {
        console.error('Habit save error:', error);
        alert('Failed to save habit. Please try again.');
    }
}

// Set up delete confirmation
elements.confirmDelete?.addEventListener('click', async () => {
    const habitId = getHabitToDelete();
    if (!habitId) return;

    try {
        await deleteHabit(habitId);
        closeDeleteModal();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete habit. Please try again.');
    }
});

// Handle logout
async function handleLogout() {
    try {
        await logOut();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to sign out. Please try again.');
    }
}

// Show screen
function showScreen(screenName) {
    state.currentScreen = screenName;

    const screens = ['loading', 'auth', 'onboarding', 'main', 'dashboard', 'settings'];
    screens.forEach(name => {
        const screen = document.getElementById(`${name}-screen`);
        if (screen) {
            screen.classList.toggle('active', name === screenName);
        }
    });
}

// Show configuration required message
function showConfigurationRequired() {
    const loadingContent = document.querySelector('.loading-content');
    if (loadingContent) {
        loadingContent.innerHTML = `
            <div class="logo">
                <span class="logo-icon">⚙️</span>
            </div>
            <h1>Setup Required</h1>
            <p style="color: var(--text-secondary); margin: 16px 0; max-width: 300px;">
                Firebase configuration is needed. Please update <code>js/firebase-config.js</code> with your Firebase project credentials.
            </p>
            <a href="https://console.firebase.google.com" target="_blank" class="btn btn-primary" style="max-width: 200px;">
                Open Firebase Console
            </a>
        `;
    }
}

// Show error message
function showError(message) {
    const loadingContent = document.querySelector('.loading-content');
    if (loadingContent) {
        loadingContent.innerHTML = `
            <div class="logo" style="background: var(--accent-danger);">
                <span class="logo-icon">!</span>
            </div>
            <h1>Error</h1>
            <p style="color: var(--text-secondary); margin: 16px 0;">${message}</p>
            <button onclick="location.reload()" class="btn btn-primary" style="max-width: 150px;">
                Refresh
            </button>
        `;
    }
}

// Get friendly auth error message
function getAuthErrorMessage(error) {
    const messages = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/operation-not-allowed': 'Email sign-in is not enabled. Please contact support.',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };
    return messages[error.code] || 'An error occurred. Please try again.';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.habitTrackerApp = {
    state,
    getHabits: () => state.habits,
    getEntry: () => state.entry,
    selectDate
};
