// ========== ONBOARDING WORKFLOW ==========
// 4-step onboarding process for new users

import { DEFAULT_MORNING_HABITS, DEFAULT_EVENING_HABITS } from './constants.js';
import { openScheduleModal, getScheduleCallback } from './modals.js';
import { getScheduleLabel } from './schedule.js';
import { completeOnboarding } from './profile.js';
import { getUserId } from './auth.js';
import { getFirestoreDb } from './firebase-config.js';

// Firebase Firestore functions (loaded dynamically)
let collection = null;
let addDoc = null;
let serverTimestamp = null;

// Onboarding state
const onboardingState = {
    step: 1,
    habits: {
        morning: [],
        evening: []
    }
};

// Callbacks
let onCompleteCallback = null;

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize onboarding module
 */
export async function initOnboarding() {
    const firestoreModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    collection = firestoreModule.collection;
    addDoc = firestoreModule.addDoc;
    serverTimestamp = firestoreModule.serverTimestamp;
}

/**
 * Initialize onboarding workflow and reset state
 * @param {Function} onComplete - Callback to call when onboarding is finished
 */
export function initializeOnboarding(onComplete) {
    onboardingState.step = 1;
    onboardingState.habits = {
        morning: DEFAULT_MORNING_HABITS.map((name, i) => ({
            name,
            type: 'morning',
            order: i + 1,
            selected: true,
            schedule: { type: 'daily' }
        })),
        evening: DEFAULT_EVENING_HABITS.map((name, i) => ({
            name,
            type: 'evening',
            order: i + 1,
            selected: true,
            schedule: { type: 'daily' }
        }))
    };
    onCompleteCallback = onComplete;
    renderOnboardingStep();
}

/**
 * Render current onboarding step
 */
export function renderOnboardingStep() {
    updateOnboardingProgress();
    const content = document.getElementById('onboarding-content');

    switch(onboardingState.step) {
        case 1:
            content.innerHTML = renderWelcomeStep();
            break;
        case 2:
            content.innerHTML = renderHabitSetupStep('morning');
            attachHabitSetupListeners('morning');
            break;
        case 3:
            content.innerHTML = renderHabitSetupStep('evening');
            attachHabitSetupListeners('evening');
            break;
        case 4:
            content.innerHTML = renderReviewStep();
            break;
    }

    updateOnboardingNavButtons();
}

/**
 * Update progress indicators
 */
function updateOnboardingProgress() {
    // Update step indicators
    document.querySelectorAll('.progress-steps .step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < onboardingState.step) {
            step.classList.add('completed');
        } else if (index + 1 === onboardingState.step) {
            step.classList.add('active');
        }
    });

    // Update progress bar
    const progressFill = document.getElementById('onboarding-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${(onboardingState.step / 4) * 100}%`;
    }
}

/**
 * Update navigation button states and text
 */
function updateOnboardingNavButtons() {
    const backBtn = document.getElementById('onboarding-back');
    const skipBtn = document.getElementById('onboarding-skip');
    const nextBtn = document.getElementById('onboarding-next');

    // Back button
    if (backBtn) backBtn.style.display = onboardingState.step > 1 ? 'block' : 'none';

    // Skip button - hide on review step
    if (skipBtn) skipBtn.style.display = onboardingState.step < 4 ? 'block' : 'none';

    // Next button text
    if (nextBtn) {
        if (onboardingState.step === 1) {
            nextBtn.textContent = 'Get Started';
        } else if (onboardingState.step === 4) {
            nextBtn.textContent = 'Start Tracking';
        } else {
            nextBtn.textContent = 'Next';
        }
    }
}

/**
 * Render welcome step (step 1)
 */
function renderWelcomeStep() {
    return `
        <div class="onboarding-welcome">
            <div class="logo">
                <span class="logo-icon">&#10003;</span>
            </div>
            <h1>Welcome to Habit Tracker</h1>
            <p class="subtitle">Build better habits with flexible scheduling</p>

            <div class="feature-highlights">
                <div class="feature">
                    <span class="feature-icon">&#9788;</span>
                    <span>Track morning & evening routines</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">&#128197;</span>
                    <span>Schedule habits your way - daily, weekly, or custom</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">&#128200;</span>
                    <span>See your progress and build streaks</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render habit setup step (steps 2 & 3)
 */
function renderHabitSetupStep(type) {
    const habitsList = onboardingState.habits[type];
    const icon = type === 'morning' ? '&#9788;' : '&#9790;';
    const title = type === 'morning' ? 'Morning Routine' : 'Evening Routine';

    return `
        <div class="habit-setup">
            <h2>${icon} Set Up Your ${title}</h2>
            <p class="setup-subtitle">Select habits to track and customize their schedules</p>

            <div class="onboarding-habit-list">
                ${habitsList.map((habit, index) => `
                    <div class="onboarding-habit-item ${habit.selected ? 'selected' : ''}" data-index="${index}">
                        <div class="habit-checkbox-wrapper">
                            <input type="checkbox" ${habit.selected ? 'checked' : ''}
                                   id="habit-${type}-${index}" data-index="${index}">
                        </div>
                        <input type="text" class="habit-name-input" value="${escapeHtml(habit.name)}"
                               data-index="${index}" placeholder="Habit name">
                        <button type="button" class="schedule-btn" data-index="${index}" data-type="${type}">
                            ${getScheduleLabel(habit.schedule)}
                        </button>
                    </div>
                `).join('')}
            </div>

            <button type="button" class="btn-add-onboarding" id="add-custom-${type}">
                <span>+ Add Custom Habit</span>
            </button>
        </div>
    `;
}

/**
 * Attach event listeners to habit setup UI
 */
function attachHabitSetupListeners(type) {
    const habitsList = onboardingState.habits[type];

    // Checkbox listeners
    document.querySelectorAll('.onboarding-habit-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            habitsList[index].selected = e.target.checked;
            e.target.closest('.onboarding-habit-item').classList.toggle('selected', e.target.checked);
        });
    });

    // Name input listeners
    document.querySelectorAll('.habit-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            habitsList[index].name = e.target.value;
        });
    });

    // Schedule button listeners
    document.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            openScheduleModal(habitsList[index], (newSchedule) => {
                habitsList[index].schedule = newSchedule;
                e.target.textContent = getScheduleLabel(newSchedule);
            });
        });
    });

    // Add custom habit button
    const addBtn = document.getElementById(`add-custom-${type}`);
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            habitsList.push({
                name: '',
                type: type,
                order: habitsList.length + 1,
                selected: true,
                schedule: { type: 'daily' }
            });
            renderOnboardingStep();
            // Focus the new input
            setTimeout(() => {
                const inputs = document.querySelectorAll('.habit-name-input');
                if (inputs.length > 0) {
                    inputs[inputs.length - 1].focus();
                }
            }, 100);
        });
    }
}

/**
 * Render review step (step 4)
 */
function renderReviewStep() {
    const morningSelected = onboardingState.habits.morning.filter(h => h.selected && h.name.trim());
    const eveningSelected = onboardingState.habits.evening.filter(h => h.selected && h.name.trim());

    return `
        <div class="onboarding-review">
            <div class="success-icon">&#10003;</div>
            <h2>You're All Set!</h2>
            <p class="review-subtitle">Here's your habit tracking plan</p>

            <div class="review-summary">
                <div class="summary-card">
                    <span class="card-value">${morningSelected.length}</span>
                    <span class="card-label">Morning</span>
                </div>
                <div class="summary-card">
                    <span class="card-value">${eveningSelected.length}</span>
                    <span class="card-label">Evening</span>
                </div>
            </div>

            <div class="review-details">
                ${morningSelected.length > 0 ? `
                    <div class="review-section">
                        <h3>&#9788; Morning Habits</h3>
                        ${morningSelected.map(h => `
                            <div class="review-habit">
                                <span>${escapeHtml(h.name)}</span>
                                <span class="schedule-label">${getScheduleLabel(h.schedule)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${eveningSelected.length > 0 ? `
                    <div class="review-section">
                        <h3>&#9790; Evening Habits</h3>
                        ${eveningSelected.map(h => `
                            <div class="review-habit">
                                <span>${escapeHtml(h.name)}</span>
                                <span class="schedule-label">${getScheduleLabel(h.schedule)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${morningSelected.length === 0 && eveningSelected.length === 0 ? `
                    <p style="text-align: center; color: var(--text-muted);">No habits selected. You can add them later in Settings.</p>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Go to next onboarding step
 */
export async function goToNextStep() {
    if (onboardingState.step === 4) {
        // Finish onboarding
        await finishOnboarding();
    } else {
        onboardingState.step++;
        renderOnboardingStep();
    }
}

/**
 * Go to previous onboarding step
 */
export function goToPreviousStep() {
    if (onboardingState.step > 1) {
        onboardingState.step--;
        renderOnboardingStep();
    }
}

/**
 * Skip to review step
 */
export function skipToReview() {
    onboardingState.step = 4;
    renderOnboardingStep();
}

/**
 * Finish onboarding and save habits to Firestore
 */
export async function finishOnboarding() {
    const nextBtn = document.getElementById('onboarding-next');
    if (nextBtn) {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Saving...';
    }

    try {
        const db = getFirestoreDb();
        const userId = getUserId();

        if (!userId) {
            throw new Error('No user ID available');
        }

        // Save habits to Firestore
        const habitsRef = collection(db, `users/${userId}/habits`);

        // Save morning habits
        const morningSelected = onboardingState.habits.morning.filter(h => h.selected && h.name.trim());
        for (let i = 0; i < morningSelected.length; i++) {
            const habit = morningSelected[i];
            await addDoc(habitsRef, {
                name: habit.name.trim(),
                type: 'morning',
                order: i + 1,
                schedule: habit.schedule,
                createdAt: serverTimestamp(),
                archived: false
            });
        }

        // Save evening habits
        const eveningSelected = onboardingState.habits.evening.filter(h => h.selected && h.name.trim());
        for (let i = 0; i < eveningSelected.length; i++) {
            const habit = eveningSelected[i];
            await addDoc(habitsRef, {
                name: habit.name.trim(),
                type: 'evening',
                order: i + 1,
                schedule: habit.schedule,
                createdAt: serverTimestamp(),
                archived: false
            });
        }

        // Mark onboarding complete
        await completeOnboarding();

        // Call completion callback
        if (onCompleteCallback) {
            onCompleteCallback();
        }

    } catch (error) {
        console.error('Error finishing onboarding:', error);
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Start Tracking';
        }
        alert('Failed to save habits. Please try again.');
    }
}

/**
 * Get current onboarding step
 */
export function getCurrentStep() {
    return onboardingState.step;
}

/**
 * Get selected habits for onboarding
 */
export function getOnboardingHabits() {
    return {
        morning: onboardingState.habits.morning.filter(h => h.selected && h.name.trim()),
        evening: onboardingState.habits.evening.filter(h => h.selected && h.name.trim())
    };
}
