// ========== ONBOARDING ==========
// Functions for the multi-step onboarding flow

import {
    onboardingStep, onboardingHabits, onboardingSelectedGoal,
    currentUser,
    setOnboardingStep, setOnboardingHabits, setOnboardingSelectedGoal,
    resetOnboardingState
} from './state.js';
import { getDb, collection, addDoc, serverTimestamp } from './firebase-init.js';
import { escapeHtml } from './utils.js';
import { getScheduleLabel } from './schedule.js';
import { completeOnboarding } from './profile.js';
import { openScheduleModal } from './modals.js';
import { PREDEFINED_ROUTINES } from './routines-config.js';
import { ROUTINE_EVIDENCE } from './routine-evidence.js';

// Callbacks for after onboarding (set by main.js)
let onboardingCompleteCallback = null;
let onboardingScienceMode = { morning: false, evening: false };

/**
 * Set the callback for when onboarding is complete
 * @param {Function} callback - Function to call after onboarding
 */
export function setOnboardingCompleteCallback(callback) {
    onboardingCompleteCallback = callback;
}

/**
 * Initialize the onboarding flow
 */
export function initializeOnboarding() {
    resetOnboardingState();
    resetScienceMode();
    setOnboardingStep(1);
    renderOnboardingStep();
}

/**
 * Render the current onboarding step
 */
export function renderOnboardingStep() {
    updateOnboardingProgress();
    const content = document.getElementById('onboarding-content');

    switch(onboardingStep) {
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
 * Go to the next onboarding step
 */
export function nextOnboardingStep() {
    if (onboardingStep === 1) {
        if (!processGoalSelection()) return;
    }

    if (onboardingStep < 4) {
        setOnboardingStep(onboardingStep + 1);
        renderOnboardingStep();
    } else {
        finishOnboarding();
    }
}

/**
 * Go to the previous onboarding step
 */
export function previousOnboardingStep() {
    if (onboardingStep > 1) {
        setOnboardingStep(onboardingStep - 1);
        renderOnboardingStep();
    }
}

function updateOnboardingProgress() {
    // Update step indicators
    document.querySelectorAll('.progress-steps .step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < onboardingStep) {
            step.classList.add('completed');
        } else if (index + 1 === onboardingStep) {
            step.classList.add('active');
        }
    });

    // Update progress bar
    const progressFill = document.getElementById('onboarding-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${(onboardingStep / 4) * 100}%`;
    }
}

function updateOnboardingNavButtons() {
    const backBtn = document.getElementById('onboarding-back');
    const skipBtn = document.getElementById('onboarding-skip');
    const nextBtn = document.getElementById('onboarding-next');

    // Back button
    if (backBtn) backBtn.style.display = onboardingStep > 1 ? 'block' : 'none';

    // Skip button - hide for new flow
    if (skipBtn) skipBtn.style.display = 'none';

    // Next button text
    if (nextBtn) {
        if (onboardingStep === 1) {
            nextBtn.textContent = 'Continue';
        } else if (onboardingStep === 4) {
            nextBtn.textContent = 'Start your journey';
        } else {
            nextBtn.textContent = 'Next';
        }
    }
}

function renderGoalSelectionStep() {
    return `
        <div class="onboarding-welcome">
            <div class="logo">
                <img src="assets/logo-white-back.svg" alt="Axiom Forge" class="logo-image">
            </div>
            <h1>Welcome to <span class="brand-highlight">Axiom Forge</span></h1>
            <p class="onboarding-copy">
                You're here to become the best version of yourself, and we'll make it simple with science-backed routines.
                Choose one that's ready to go or create your own in minutes.
            </p>

            <div class="goal-selection-container">
                <label for="goal-select" class="goal-label">What is your goal?</label>
                <div class="custom-select-wrapper">
                    <select id="goal-select" class="goal-select">
                        <option value="" disabled selected>Select a goal...</option>
                        ${Object.entries(PREDEFINED_ROUTINES).map(([key, routine]) => `
                            <option value="${key}">${routine.label}</option>
                        `).join('')}
                        <option value="custom">Other, I'll create my own routines</option>
                    </select>
                </div>
                <p id="goal-description" class="goal-description"></p>
                <div id="science-summary" class="science-summary-box">
                    <div class="science-summary-title">Scientific basis</div>
                    <div id="science-summary-text" class="science-summary-text"></div>
                </div>
            </div>
        </div>
    `;
}

function attachGoalSelectionListeners() {
    const select = document.getElementById('goal-select');
    const desc = document.getElementById('goal-description');
    const summaryBox = document.getElementById('science-summary');
    const summaryText = document.getElementById('science-summary-text');

    if (select) {
        if (onboardingSelectedGoal) {
            select.value = onboardingSelectedGoal;
            updateDescription(onboardingSelectedGoal);
        }

        select.addEventListener('change', (e) => {
            setOnboardingSelectedGoal(e.target.value);
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

        if (!summaryBox || !summaryText) return;
        const basis = ROUTINE_EVIDENCE[value]?.scientific_basis;
        if (basis) {
            summaryText.textContent = basis;
            summaryBox.classList.add('visible');
        } else {
            summaryText.textContent = '';
            summaryBox.classList.remove('visible');
        }
    }
}

function processGoalSelection() {
    const goal = onboardingSelectedGoal;
    if (!goal) {
        alert('Please select a goal to continue.');
        return false;
    }

    // Populate habits
    if (goal === 'custom') {
        setOnboardingHabits({ morning: [], evening: [] });
    } else {
        const routine = PREDEFINED_ROUTINES[goal];
        if (routine) {
            setOnboardingHabits({
                morning: routine.morning.map((name, i) => ({
                    name,
                    type: 'morning',
                    order: i + 1,
                    selected: true,
                    schedule: { type: 'daily' },
                    evidenceOpen: false
                })),
                evening: routine.evening.map((name, i) => ({
                    name,
                    type: 'evening',
                    order: i + 1,
                    selected: true,
                    schedule: { type: 'daily' },
                    evidenceOpen: false
                }))
            });
        }
    }
    resetScienceMode();
    return true;
}

function renderHabitSetupStep(type) {
    const habitsList = onboardingHabits[type];
    const icon = type === 'morning' ? '&#9788;' : '&#9790;';
    const title = type === 'morning' ? 'Morning Routine' : 'Evening Routine';
    const goalName = onboardingSelectedGoal && PREDEFINED_ROUTINES[onboardingSelectedGoal]
        ? PREDEFINED_ROUTINES[onboardingSelectedGoal].label
        : 'Custom';
    const scienceModeOn = onboardingScienceMode[type];

    return `
        <div class="habit-setup">
            <h2>${icon} ${title}</h2>
            <p class="setup-subtitle">Customize your routine. Drag to reorder.</p>
            <p class="setup-explanation">
                Based on your goal to <strong>${goalName}</strong>, we've selected these science-backed habits.
                Feel free to adjust the frequency (Daily, Weekly, etc.) or add your own to make it work for you.
            </p>
            <div class="science-toggle-row">
                <span class="science-label">Explain the science</span>
                <button type="button" class="science-toggle ${scienceModeOn ? 'active' : ''}" id="science-toggle-${type}" aria-pressed="${scienceModeOn}">
                    <span class="science-toggle-handle"></span>
                </button>
            </div>

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
    const evidenceEntry = getEvidenceEntry(onboardingSelectedGoal, type, habit.name);
    const evidence = evidenceEntry ? evidenceEntry.evidence : null;
    const hasEvidence = Boolean(evidenceEntry);
    const evidenceOpen = Boolean(habit.evidenceOpen);
    const evidenceSummary = evidence?.summary ? `
        <div class="evidence-summary">${escapeHtml(evidence.summary)}</div>
    ` : '';
    const evidenceLink = evidence?.link ? `
        <a class="evidence-link" href="${escapeHtml(evidence.link)}" target="_blank" rel="noopener noreferrer">Read Source</a>
    ` : '';

    return `
        <div class="onboarding-habit-item" draggable="true" data-index="${index}" data-type="${type}">
            <div class="onboarding-habit-row">
                <span class="drag-handle-icon">&#9776;</span>
                <input type="text" class="habit-name-input" value="${escapeHtml(habit.name)}"
                    data-index="${index}" placeholder="Habit name">

                <div class="habit-actions">
                    ${hasEvidence ? `
                        <button type="button" class="why-btn ${evidenceOpen ? 'active' : ''}" data-index="${index}" data-type="${type}" title="Why?">
                            Why?
                        </button>
                    ` : ''}
                    <button type="button" class="schedule-btn" data-index="${index}" data-type="${type}" title="Schedule">
                        ${getScheduleLabel(habit.schedule)}
                    </button>
                    <button type="button" class="delete-btn" data-index="${index}" data-type="${type}" title="Remove">
                        &times;
                    </button>
                </div>
            </div>
            ${hasEvidence ? `
                <div class="evidence-card ${evidenceOpen ? 'open' : ''}">
                    <span class="evidence-source">${escapeHtml(evidence.source)}</span>
                    ${evidenceSummary}
                    ${evidenceLink}
                </div>
            ` : ''}
        </div>
    `;
}

function attachHabitSetupListeners(type) {
    const listContainer = document.getElementById(`onboarding-list-${type}`);
    const habitsList = onboardingHabits[type];
    const scienceToggle = document.getElementById(`science-toggle-${type}`);

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
            const habit = habitsList[idx];

            // Open the existing schedule modal
            openScheduleModal(habit, (newSchedule) => {
                // Update state
                habit.schedule = newSchedule;
                // Update UI immediately
                renderOnboardingStep();
            });
        });
    });

    // Delete Button
    listContainer.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            habitsList.splice(idx, 1);
            renderOnboardingStep();
        });
    });

    // Why Button
    listContainer.querySelectorAll('.why-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.dataset.index);
            habitsList[idx].evidenceOpen = !habitsList[idx].evidenceOpen;
            renderOnboardingStep();
        });
    });

    // Global Science Toggle
    if (scienceToggle) {
        scienceToggle.addEventListener('click', () => {
            onboardingScienceMode[type] = !onboardingScienceMode[type];
            const enableAll = onboardingScienceMode[type];
            habitsList.forEach(habit => {
                const entry = getEvidenceEntry(onboardingSelectedGoal, type, habit.name);
                if (entry) {
                    habit.evidenceOpen = enableAll;
                }
            });
            renderOnboardingStep();
        });
    }

    // Add Custom Habit Button
    const addBtn = document.getElementById(`add-custom-${type}`);
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            habitsList.push({
                name: '',
                type: type,
                order: habitsList.length + 1,
                selected: true,
                schedule: { type: 'daily' },
                evidenceOpen: false
            });
            renderOnboardingStep();
            setTimeout(() => {
                const inputs = document.querySelectorAll('.habit-name-input');
                if (inputs.length > 0) inputs[inputs.length - 1].focus();
            }, 50);
        });
    }

    // Drag and Drop Logic
    setupDragAndDrop(listContainer, habitsList, type);
}

function setupDragAndDrop(listContainer, habitsList, type) {
    let draggedItem = null;

    listContainer.querySelectorAll('.onboarding-habit-item').forEach(item => {
        const handle = item.querySelector('.drag-handle-icon');

        // Mouse Events
        item.addEventListener('dragstart', function(e) {
            draggedItem = this;
            e.dataTransfer.effectAllowed = 'move';
            this.classList.add('dragging');
        });

        item.addEventListener('dragover', function(e) {
            e.preventDefault();
            if (this === draggedItem) return;
            handleDragOverLogic(this);
        });

        item.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedItem = null;
            updateOrder();
        });

        // Touch Events (Mobile)
        if (handle) {
            handle.addEventListener('touchstart', function(e) {
                if (e.cancelable) e.preventDefault();
                draggedItem = item;
                item.classList.add('dragging', 'touch-dragging');
            }, { passive: false });

            handle.addEventListener('touchmove', function(e) {
                if (!draggedItem) return;
                if (e.cancelable) e.preventDefault();

                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (!target) return;

                const closestItem = target.closest('.onboarding-habit-item');
                if (closestItem && closestItem !== draggedItem && closestItem.parentNode === listContainer) {
                    handleDragOverLogic(closestItem);
                }
            }, { passive: false });

            handle.addEventListener('touchend', function(e) {
                if (!draggedItem) return;
                item.classList.remove('dragging', 'touch-dragging');
                draggedItem = null;
                updateOrder();
            });
        }
    });

    function handleDragOverLogic(targetItem) {
        const items = [...listContainer.querySelectorAll('.onboarding-habit-item')];
        const currentIdx = items.indexOf(draggedItem);
        const targetIdx = items.indexOf(targetItem);

        if (currentIdx > targetIdx) {
            listContainer.insertBefore(draggedItem, targetItem);
        } else {
            listContainer.insertBefore(draggedItem, targetItem.nextSibling);
        }
    }

    function updateOrder() {
        const newOrderIndices = [...listContainer.querySelectorAll('.onboarding-habit-item')]
            .map(el => parseInt(el.querySelector('.habit-name-input').dataset.index));

        const reorderedList = newOrderIndices.map(oldIndex => habitsList[oldIndex]);
        onboardingHabits[type] = reorderedList;
        renderOnboardingStep();
    }
}

function renderReviewStep() {
    const morningSelected = onboardingHabits.morning.filter(h => h.name.trim());
    const eveningSelected = onboardingHabits.evening.filter(h => h.name.trim());

    return `
        <div class="onboarding-review">
            <h2>You're All Set!</h2>
            <p class="review-subtitle">Here is your plan</p>

            <div class="review-details">
                <div class="review-section" style="margin-bottom: 24px;">
                    <h3>&#9788; Morning</h3>
                    <div class="review-grid">
                        ${morningSelected.length > 0 ? morningSelected.map(h => `
                            <div class="review-card">
                                <span class="review-card-name">${escapeHtml(h.name)}</span>
                                <span class="review-card-schedule">${getScheduleLabel(h.schedule)}</span>
                            </div>
                        `).join('') : '<p class="text-muted">No habits</p>'}
                    </div>
                </div>

                <div class="review-section">
                    <h3>&#9790; Evening</h3>
                    <div class="review-grid">
                        ${eveningSelected.length > 0 ? eveningSelected.map(h => `
                            <div class="review-card">
                                <span class="review-card-name">${escapeHtml(h.name)}</span>
                                <span class="review-card-schedule">${getScheduleLabel(h.schedule)}</span>
                            </div>
                        `).join('') : '<p class="text-muted">No habits</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function resetScienceMode() {
    onboardingScienceMode = { morning: false, evening: false };
}

function getEvidenceEntry(goal, type, habitName) {
    if (!goal || !type || !habitName) return null;
    const routine = ROUTINE_EVIDENCE[goal];
    if (!routine || !routine[type]) return null;
    return routine[type].find(item => item.step === habitName) || null;
}

async function finishOnboarding() {
    const nextBtn = document.getElementById('onboarding-next');
    nextBtn.disabled = true;
    nextBtn.textContent = 'Saving...';

    try {
        const db = getDb();
        // Save habits to Firestore
        const habitsRef = collection(db, `users/${currentUser.uid}/habits`);

        // Save morning habits
        const morningSelected = onboardingHabits.morning.filter(h => h.selected && h.name.trim());
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
        const eveningSelected = onboardingHabits.evening.filter(h => h.selected && h.name.trim());
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

        // Call the completion callback
        if (onboardingCompleteCallback) {
            onboardingCompleteCallback();
        }

    } catch (error) {
        console.error('Error finishing onboarding:', error);
        nextBtn.disabled = false;
        nextBtn.textContent = 'Start Tracking';
        alert('Failed to save habits. Please try again.');
    }
}
