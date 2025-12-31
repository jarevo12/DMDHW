// ========== MAIN ENTRY POINT ==========
// Application bootstrap and event listener setup

// Firebase initialization
import { initializeFirebase, getDb, getAuthInstance, serverTimestamp } from './firebase-init.js';

// State management
import {
    currentDate, currentTab, calendarState, settingsFilter, settingsSearch,
    setCurrentDate, setCurrentTab, setCalendarState, setSettingsFilter, setSettingsSearch
} from './state.js';

// Auth
import {
    setAuthStateCallback, initAuth, checkIsSignInWithEmailLink,
    handleEmailLinkSignIn, sendMagicLink, signInWithPassword, createAccount, logout
} from './auth.js';

// Profile
import { getUserProfile, setUserProfile } from './profile.js';

// Habits
import { setHabitsChangeCallback, subscribeToHabits, addHabit, updateHabit, deleteHabit } from './habits.js';

// Entries
import { setEntryChangeCallback, subscribeToEntry } from './entries.js';

// Schedule
import { getScheduleLabel } from './schedule.js';

// UI
import { showScreen, updateLoadingStatus, showError } from './ui/screens.js';
import { updateProgress, updateDateDisplay } from './ui/progress.js';
import { renderHabits, updateHabitCheckmarks } from './ui/habits-ui.js';
import { renderEditableHabits, setOpenHabitModalCallback, setOpenDeleteModalCallback } from './ui/settings-ui.js';

// Complex features
import {
    openHabitModal, closeHabitModal, openDeleteModal, closeDeleteModal, setConfirmDeleteCallback,
    openScheduleModal, closeScheduleModal, renderScheduleOptions, getScheduleFromModal
} from './modals.js';
import {
    setOnboardingCompleteCallback, initializeOnboarding, renderOnboardingStep,
    nextOnboardingStep, previousOnboardingStep
} from './onboarding.js';
import { renderDashboard, updateDashboardData } from './dashboard.js';
import { renderTodayCalendar, selectCalendarDate, previousMonth, nextMonth, toggleCalendar } from './calendar-picker.js';

// Utils
import { formatDate } from './utils.js';

// ========== INITIALIZATION ==========

async function init() {
    updateLoadingStatus('Connecting to server...');

    try {
        // Initialize Firebase
        await initializeFirebase();

        updateLoadingStatus('Checking authentication...');

        // Check for email link sign-in
        if (checkIsSignInWithEmailLink()) {
            await handleEmailLinkSignIn();
        }

        // Set up auth state callback
        setAuthStateCallback(handleAuthStateChange);

        // Initialize auth (sets up listener)
        initAuth();

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to connect. Please refresh the page.');
    }
}

async function handleAuthStateChange(user) {
    if (user) {
        console.log('User signed in:', user.email);
        updateLoadingStatus('Loading your profile...');

        // Check if user has completed onboarding
        const profile = await getUserProfile();

        if (!profile || !profile.onboardingCompleted) {
            // New user - show onboarding
            console.log('New user - starting onboarding');
            initializeOnboarding();
            showScreen('onboarding');
        } else {
            // Existing user - normal flow
            console.log('Existing user - loading dashboard');
            updateLoadingStatus('Loading your habits...');

            // Subscribe to data
            subscribeToHabits();
            subscribeToEntry();

            // Update UI
            document.getElementById('user-email').textContent = user.email;
            showScreen('dashboard');
            updateDateDisplay();
            renderDashboard();
        }

    } else {
        console.log('No user signed in');
        showScreen('auth');
    }
}

// ========== CALLBACKS SETUP ==========

// Set up habits change callback
setHabitsChangeCallback((newHabits) => {
    renderHabits();
    renderEditableHabits();
    updateProgress();
});

// Set up entry change callback
setEntryChangeCallback((entry) => {
    updateHabitCheckmarks();
    updateProgress();
});

// Set up onboarding complete callback
setOnboardingCompleteCallback(() => {
    subscribeToHabits();
    subscribeToEntry();
    const user = getAuthInstance().currentUser;
    if (user) {
        document.getElementById('user-email').textContent = user.email;
    }
    showScreen('dashboard');
    updateDateDisplay();
    renderDashboard();
});

// Set up settings modal callbacks
setOpenHabitModalCallback(openHabitModal);
setOpenDeleteModalCallback(openDeleteModal);

// Set up delete confirm callback
setConfirmDeleteCallback(async (habitId) => {
    try {
        await deleteHabit(habitId);
    } catch (error) {
        console.error('Error deleting habit:', error);
        alert('Failed to delete habit.');
    }
});

// ========== EVENT LISTENERS ==========

document.addEventListener('DOMContentLoaded', () => {
    // Toggle between magic link and password authentication
    let usePassword = true;

    document.getElementById('toggle-auth-method').addEventListener('click', () => {
        usePassword = !usePassword;
        const passwordGroup = document.getElementById('password-group');
        const passwordInput = document.getElementById('password-input');
        const toggleText = document.getElementById('toggle-text');
        const magicLinkBtn = document.getElementById('magic-link-btn');
        const passwordButtons = document.getElementById('password-buttons');

        if (usePassword) {
            passwordGroup.style.display = 'block';
            passwordInput.required = true;
            toggleText.textContent = 'Use magic link instead';
            magicLinkBtn.style.display = 'none';
            passwordButtons.style.display = 'flex';
        } else {
            passwordGroup.style.display = 'none';
            passwordInput.required = false;
            passwordInput.value = '';
            toggleText.textContent = 'Use password instead';
            magicLinkBtn.style.display = 'block';
            passwordButtons.style.display = 'none';
        }
    });

    // Magic Link form submission
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input').value.trim();
        const btn = document.getElementById('magic-link-btn');

        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';

        try {
            await sendMagicLink(email);
            document.getElementById('auth-form').classList.add('hidden');
            document.getElementById('auth-message').classList.remove('hidden');
            document.getElementById('sent-email').textContent = email;
        } catch (error) {
            console.error('Auth error:', error);
            let errorMsg = 'Failed to send email. ';
            if (error.code === 'auth/quota-exceeded') {
                errorMsg = 'Daily quota exceeded. Please use password authentication instead.';
            } else if (error.code === 'auth/operation-not-allowed') {
                errorMsg = 'Email link sign-in is not enabled. Please enable it in Firebase Console.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Please enter a valid email address.';
            } else if (error.code === 'auth/missing-continue-uri') {
                errorMsg = 'Configuration error. Missing continue URL.';
            } else if (error.code === 'auth/unauthorized-continue-uri') {
                errorMsg = 'This domain is not authorized. Add localhost to Firebase authorized domains.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            document.getElementById('auth-error').textContent = errorMsg;
            document.getElementById('auth-error').classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Send Magic Link</span>';
        }
    });

    // Sign In button handler
    document.getElementById('signin-btn').addEventListener('click', async () => {
        const email = document.getElementById('email-input').value.trim();
        const password = document.getElementById('password-input').value;
        const btn = document.getElementById('signin-btn');

        if (!email || !password) {
            document.getElementById('auth-error').textContent = 'Please enter email and password.';
            document.getElementById('auth-error').classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span>Signing in...</span>';
        document.getElementById('auth-error').classList.add('hidden');

        try {
            await signInWithPassword(email, password);
            // Success - handleAuthStateChange will be triggered automatically
        } catch (error) {
            console.error('Sign in error:', error);
            let errorMsg = 'Sign in failed. ';
            if (error.code === 'auth/invalid-credential' ||
                error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password') {
                errorMsg = 'Invalid email or password. Please try again or sign up.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Please enter a valid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMsg = 'Too many failed attempts. Please try again later.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            document.getElementById('auth-error').textContent = errorMsg;
            document.getElementById('auth-error').classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Sign In</span>';
        }
    });

    // Navigation to Signup Screen
    document.getElementById('nav-to-signup').addEventListener('click', () => {
        showScreen('signup');
    });

    // Back to Login
    document.getElementById('back-to-login').addEventListener('click', () => {
        showScreen('auth');
    });

    // Password Validation Listener
    const signupPasswordInput = document.getElementById('signup-password');
    signupPasswordInput.addEventListener('input', (e) => {
        const password = e.target.value;

        // Length check
        const lengthMet = password.length > 8;
        const reqLength = document.getElementById('req-length');
        reqLength.classList.toggle('met', lengthMet);

        // Uppercase check
        const uppercaseMet = /[A-Z]/.test(password);
        const reqUppercase = document.getElementById('req-uppercase');
        reqUppercase.classList.toggle('met', uppercaseMet);

        // Special char check
        const specialMet = /[!@#$%^&*(),.?":{}|<>´.,\-_+=;:'"\\]/.test(password);
        const reqSpecial = document.getElementById('req-special');
        reqSpecial.classList.toggle('met', specialMet);
    });

    // Create Account Form Handler
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const firstName = document.getElementById('signup-firstname').value.trim();
        const surname = document.getElementById('signup-surname').value.trim();
        const age = document.getElementById('signup-age').value;
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const btn = document.getElementById('create-account-btn');
        const errorDiv = document.getElementById('signup-error');

        // Validate Requirements
        if (password.length <= 8 || !/[A-Z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>´.,\-_+=;:'"\\]/.test(password)) {
            errorDiv.textContent = 'Please meet all password requirements.';
            errorDiv.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating account...';
        errorDiv.classList.add('hidden');

        try {
            // Create User
            await createAccount(email, password);

            // Save Profile Data
            await setUserProfile({
                firstName,
                surname,
                age: parseInt(age),
                email,
                createdAt: serverTimestamp()
            });

        } catch (error) {
            console.error('Sign up error:', error);
            let errorMsg = 'Sign up failed. ';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'Email already registered. Please sign in instead.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            errorDiv.textContent = errorMsg;
            errorDiv.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });

    document.getElementById('try-again').addEventListener('click', () => {
        document.getElementById('auth-form').classList.remove('hidden');
        document.getElementById('auth-message').classList.add('hidden');
        document.getElementById('email-input').value = '';
    });

    // Calendar toggle
    document.getElementById('toggle-calendar').addEventListener('click', toggleCalendar);

    // Go to today button
    document.getElementById('today-btn').addEventListener('click', () => {
        setCurrentDate(new Date());
        updateDateDisplay();
        subscribeToEntry();
        if (calendarState.isOpen) {
            setCalendarState({ isOpen: false });
            document.getElementById('calendar-picker').classList.add('hidden');
            document.getElementById('toggle-calendar').classList.remove('active');
        }
    });

    // Previous Day
    document.getElementById('prev-date').addEventListener('click', () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
        updateDateDisplay();
        subscribeToEntry();
    });

    // Next Day
    document.getElementById('next-date').addEventListener('click', () => {
        const today = new Date();
        const isToday = formatDate(currentDate) === formatDate(today);

        if (!isToday) {
            const newDate = new Date(currentDate);
            newDate.setDate(newDate.getDate() + 1);
            setCurrentDate(newDate);
            updateDateDisplay();
            subscribeToEntry();
        }
    });

    // Calendar month navigation
    document.getElementById('prev-month').addEventListener('click', previousMonth);
    document.getElementById('next-month').addEventListener('click', nextMonth);

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setCurrentTab(btn.dataset.tab);
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
            document.getElementById('morning-habits').classList.toggle('active', currentTab === 'morning');
            document.getElementById('evening-habits').classList.toggle('active', currentTab === 'evening');
            updateProgress();
        });
    });

    // Settings controls
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setSettingsFilter(btn.dataset.filter);
            renderEditableHabits();
        });
    });

    document.getElementById('settings-search').addEventListener('input', (e) => {
        setSettingsSearch(e.target.value);
        renderEditableHabits();
    });

    // Bottom navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));

            if (view === 'today') showScreen('main');
            else if (view === 'dashboard') {
                showScreen('dashboard');
                renderDashboard();
            }
            else if (view === 'settings') showScreen('settings');
        });
    });

    // Dashboard tabs
    document.querySelectorAll('.dash-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.dash-tab').forEach(b => b.classList.toggle('active', b === btn));
            renderDashboard();
        });
    });

    // Month selector change
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            updateDashboardData(year, month);
        });
    }

    // Add habit buttons
    document.getElementById('add-new-habit').addEventListener('click', () => {
        const type = settingsFilter === 'evening' ? 'evening' : 'morning';
        openHabitModal(null, type);
    });

    // Habit modal
    document.getElementById('habit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('habit-id').value;
        const type = document.getElementById('habit-type').value;
        const name = document.getElementById('habit-name').value.trim();
        const schedule = JSON.parse(document.getElementById('habit-schedule').value);

        if (!name) return;

        try {
            if (id) {
                await updateHabit(id, name, schedule);
            } else {
                await addHabit(name, type, schedule);
            }
            closeHabitModal();
        } catch (error) {
            console.error('Error saving habit:', error);
            alert('Failed to save habit.');
        }
    });

    document.getElementById('cancel-habit').addEventListener('click', closeHabitModal);
    document.querySelector('#habit-modal .modal-overlay').addEventListener('click', closeHabitModal);

    // Schedule picker in habit modal
    document.getElementById('habit-schedule-btn').addEventListener('click', () => {
        const currentSchedule = JSON.parse(document.getElementById('habit-schedule').value);
        openScheduleModal({ schedule: currentSchedule }, (newSchedule) => {
            document.getElementById('habit-schedule').value = JSON.stringify(newSchedule);
            document.getElementById('habit-schedule-btn').textContent = getScheduleLabel(newSchedule);
        });
    });

    // Delete modal
    document.getElementById('confirm-delete').addEventListener('click', async () => {
        const { getHabitToDelete } = await import('./modals.js');
        const habitToDelete = getHabitToDelete();
        if (habitToDelete) {
            try {
                await deleteHabit(habitToDelete);
                closeDeleteModal();
            } catch (error) {
                console.error('Error deleting habit:', error);
                alert('Failed to delete habit.');
            }
        }
    });

    document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
    document.querySelector('#delete-modal .modal-overlay').addEventListener('click', closeDeleteModal);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Offline indicator
    window.addEventListener('online', () => document.getElementById('offline-indicator').classList.add('hidden'));
    window.addEventListener('offline', () => document.getElementById('offline-indicator').classList.remove('hidden'));

    // Onboarding navigation
    document.getElementById('onboarding-next').addEventListener('click', nextOnboardingStep);
    document.getElementById('onboarding-back').addEventListener('click', previousOnboardingStep);

    document.getElementById('onboarding-skip').addEventListener('click', () => {
        // Skip handled internally by onboarding module
    });

    // Schedule modal
    document.querySelectorAll('.schedule-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.schedule-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderScheduleOptions({ type: btn.dataset.type });
        });
    });

    document.getElementById('save-schedule').addEventListener('click', () => {
        const { saveScheduleFromModal } = import('./modals.js').then(m => m.saveScheduleFromModal());
    });

    document.getElementById('cancel-schedule').addEventListener('click', closeScheduleModal);
    document.querySelector('#schedule-modal .modal-overlay').addEventListener('click', closeScheduleModal);

    // Not Today section toggle
    document.getElementById('toggle-not-today').addEventListener('click', () => {
        const section = document.getElementById('not-today-section');
        section.classList.toggle('collapsed');
    });

    // Start the app
    init();
});

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
}
