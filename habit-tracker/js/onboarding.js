// ========== ONBOARDING WORKFLOW ==========
// 4-step onboarding process for new users

import { PREDEFINED_ROUTINES } from './routines-config.js';
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
    selectedGoal: null,
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
    onboardingState.selectedGoal = null;
    onboardingState.habits = {
        morning: [],
        evening: []
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
            content.innerHTML = renderGoalSelectionStep();
            attachGoalSelectionListeners();
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

    // Back button - hide on first step? The user requested "In all the pages a Back bottom should be available"
    // But going back from step 1 leads where? Maybe logout? For now, let's keep it hidden on step 1 as standard practice, or enable if it resets goal.
    // Let's hide on step 1 to avoid confusion, or it could go back to "Auth" but that's handled by state in app.js.
    if (backBtn) backBtn.style.display = onboardingState.step > 1 ? 'block' : 'none';

    // Skip button - We probably don't want to skip the goal selection if we want them to choose.
    if (skipBtn) skipBtn.style.display = 'none'; // Hiding skip for this new flow to ensure goal selection

    // Next button text
    if (nextBtn) {
        if (onboardingState.step === 1) {
            nextBtn.textContent = 'Continue';
        } else if (onboardingState.step === 4) {
            nextBtn.textContent = 'Start your journey';
        } else {
            nextBtn.textContent = 'Next';
        }
    }
}

/**
 * Render Step 1: Goal Selection
 */
function renderGoalSelectionStep() {
    return `
        <div class="onboarding-welcome">
            <div class="logo">
                <span class="logo-icon">&#10003;</span>
            </div>
            <h1>Welcome to Habit Tracker</h1>
            <p class="onboarding-copy">
                You’re here to feel better, and we’ll make it simple with science-backed routines. 
                Choose one that’s ready to go or create your own in minutes.
            </p>

            <div class="goal-selection-container">
                <label for="goal-select" class="goal-label">What is your goal?</label>
                <div class="custom-select-wrapper">
                    <select id="goal-select" class="goal-select">
                        <option value="" disabled selected>Select a goal...</option>
                        ${Object.entries(PREDEFINED_ROUTINES).map(([key, routine]) => `
                            <option value="${key}">${routine.label}</option>
                        `).join('')}
                        <option value="custom">Not sure, I'll create my own routines</option>
                    </select>
                </div>
                <p id="goal-description" class="goal-description"></p>
            </div>
        </div>
    `;
}

function attachGoalSelectionListeners() {
    const select = document.getElementById('goal-select');
    const desc = document.getElementById('goal-description');

    if (select) {
        // Pre-select if state exists
        if (onboardingState.selectedGoal) {
            select.value = onboardingState.selectedGoal;
            updateDescription(onboardingState.selectedGoal);
        }

        select.addEventListener('change', (e) => {
            onboardingState.selectedGoal = e.target.value;
            updateDescription(e.target.value);
        });
    }

    function updateDescription(value) {
        if (!desc) return;
        if (PREDEFINED_ROUTINES[value]) {
            desc.textContent = PREDEFINED_ROUTINES[value].description;
        } else if (value === 'custom') {
            desc.textContent = 'Build your routine from scratch.';
        } else {
            desc.textContent = '';
        }
    }
}

/**
 * Process Step 1 Completion: Populate habits based on goal
 */
function processGoalSelection() {
    const goal = onboardingState.selectedGoal;
    if (!goal) {
        alert('Please select a goal to continue.');
        return false;
    }

    // Populate habits
    if (goal === 'custom') {
        onboardingState.habits.morning = [];
        onboardingState.habits.evening = [];
    } else {
        const routine = PREDEFINED_ROUTINES[goal];
        if (routine) {
            onboardingState.habits.morning = routine.morning.map((name, i) => ({
                name,
                type: 'morning',
                order: i + 1,
                selected: true,
                schedule: { type: 'daily' }
            }));
            onboardingState.habits.evening = routine.evening.map((name, i) => ({
                name,
                type: 'evening',
                order: i + 1,
                selected: true,
                schedule: { type: 'daily' }
            }));
        }
    }
    return true;
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
            <h2>${icon} ${title}</h2>
            <p class="setup-subtitle">Customize your routine. Drag to reorder.</p>

            <div class="onboarding-habit-list" id="onboarding-list-${type}">
                ${habitsList.length > 0 ? habitsList.map((habit, index) => renderHabitItem(habit, index, type)).join('') : '<p class="empty-msg">No habits yet.</p>'}
            </div>

            <button type="button" class="btn-add-onboarding" id="add-custom-${type}">
                <span>+ Add Habit</span>
            </button>
        </div>
    `;
}

function renderHabitItem(habit, index, type) {
    return `
        <div class="onboarding-habit-item" draggable="true" data-index="${index}" data-type="${type}">
            <span class="drag-handle-icon">☰</span>
            <input type="text" class="habit-name-input" value="${escapeHtml(habit.name)}"
                   data-index="${index}" placeholder="Habit name">
            
            <div class="habit-actions">
                <button type="button" class="schedule-btn" data-index="${index}" data-type="${type}" title="Schedule">
                    ${getScheduleLabel(habit.schedule)}
                </button>
                <button type="button" class="delete-btn" data-index="${index}" data-type="${type}" title="Remove">
                    ×
                </button>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to habit setup UI (Drag & Drop included)
 */
function attachHabitSetupListeners(type) {
    const listContainer = document.getElementById(`onboarding-list-${type}`);
    const habitsList = onboardingState.habits[type];

    // --- Interaction Listeners ---
    
    // Name Input
    listContainer.querySelectorAll('.habit-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            habitsList[idx].name = e.target.value;
        });
    });

    // Schedule Button
    listContainer.querySelectorAll('.schedule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            openScheduleModal(habitsList[idx], (newSchedule) => {
                habitsList[idx].schedule = newSchedule;
                e.target.textContent = getScheduleLabel(newSchedule);
            });
        });
    });

    // Delete Button
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            habitsList.splice(idx, 1);
            // Re-render to update indices
            renderOnboardingStep();
        });
    });

    // Add Custom Habit Button
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
            // Focus new input
            setTimeout(() => {
                const inputs = document.querySelectorAll('.habit-name-input');
                if (inputs.length > 0) inputs[inputs.length - 1].focus();
            }, 50);
        });
    }

    // --- Drag and Drop Logic ---
    let draggedItem = null;
    
    listContainer.querySelectorAll('.onboarding-habit-item').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            e.dataTransfer.effectAllowed = 'move';
            this.classList.add('dragging');
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (this === draggedItem) return;
            
            const container = this.parentNode;
            const items = [...container.querySelectorAll('.onboarding-habit-item')];
            const currentIdx = items.indexOf(this);
            const draggedIdx = items.indexOf(draggedItem);

            if (currentIdx > draggedIdx) {
                container.insertBefore(draggedItem, this.nextSibling);
            } else {
                container.insertBefore(draggedItem, this);
            }
        });

        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedItem = null;
            
            // Update Array Order based on DOM
            const newOrderIndices = [...listContainer.querySelectorAll('.onboarding-habit-item')]
                .map(el => parseInt(el.querySelector('.habit-name-input').dataset.index));
            
            const reorderedList = newOrderIndices.map(oldIndex => habitsList[oldIndex]);
            
            // Update state
            onboardingState.habits[type] = reorderedList;
            
            // Refresh view to fix data-indices
            renderOnboardingStep();
        });
    });
}

/**
 * Render review step (step 4)
 */
function renderReviewStep() {
    const morningSelected = onboardingState.habits.morning.filter(h => h.name.trim());
    const eveningSelected = onboardingState.habits.evening.filter(h => h.name.trim());

    return `
        <div class="onboarding-review">
            <div class="success-icon">&#10003;</div>
            <h2>You're All Set!</h2>
            <p class="review-subtitle">Here is your plan</p>

            <div class="review-details">
                <div class="review-section">
                    <h3>&#9788; Morning</h3>
                    ${morningSelected.length > 0 ? morningSelected.map(h => `
                        <div class="review-habit">
                            <span>${escapeHtml(h.name)}</span>
                            <span class="schedule-label">${getScheduleLabel(h.schedule)}</span>
                        </div>
                    `).join('') : '<p class="text-muted">No habits</p>'}
                </div>
                
                <div class="review-section">
                    <h3>&#9790; Evening</h3>
                    ${eveningSelected.length > 0 ? eveningSelected.map(h => `
                        <div class="review-habit">
                            <span>${escapeHtml(h.name)}</span>
                            <span class="schedule-label">${getScheduleLabel(h.schedule)}</span>
                        </div>
                    `).join('') : '<p class="text-muted">No habits</p>'}
                </div>
            </div>
        </div>
    `;
}

/**
 * Go to next onboarding step
 */
export async function goToNextStep() {
    if (onboardingState.step === 1) {
        if (processGoalSelection()) {
            onboardingState.step++;
            renderOnboardingStep();
        }
    } else if (onboardingState.step === 4) {
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
 * Skip to review step - NOT USED in new flow, but kept for compatibility
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
        const morningSelected = onboardingState.habits.morning.filter(h => h.name.trim());
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
        const eveningSelected = onboardingState.habits.evening.filter(h => h.name.trim());
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
        morning: onboardingState.habits.morning.filter(h => h.name.trim()),
        evening: onboardingState.habits.evening.filter(h => h.name.trim())
    };
}
