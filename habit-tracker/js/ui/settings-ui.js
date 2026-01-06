// ========== SETTINGS UI ==========
// Functions for rendering the settings/habits management page

import { habits, currentUser, settingsFilter, settingsSearch } from '../state.js';
import { escapeHtml } from '../utils.js';
import { DAY_SHORTS } from '../constants.js';
import { getDb, doc, writeBatch } from '../firebase-init.js';

// Module-level state for drag and drop
let draggedItem = null;

// Callbacks for modal actions (set by main.js)
let openHabitModalCallback = null;
let openDeleteModalCallback = null;

/**
 * Set the callback for opening the habit modal
 * @param {Function} callback - Function to call when editing a habit
 */
export function setOpenHabitModalCallback(callback) {
    openHabitModalCallback = callback;
}

/**
 * Set the callback for opening the delete modal
 * @param {Function} callback - Function to call when deleting a habit
 */
export function setOpenDeleteModalCallback(callback) {
    openDeleteModalCallback = callback;
}

/**
 * Render the editable habits list in settings
 */
export function renderEditableHabits() {
    const container = document.getElementById('settings-habits-container');
    if (!container) return;

    // 1. Combine and Filter
    let allHabits = [];
    if (settingsFilter === 'all' || settingsFilter === 'morning') {
        allHabits = allHabits.concat(habits.morning.map(h => ({...h, routineType: 'morning'})));
    }
    if (settingsFilter === 'all' || settingsFilter === 'evening') {
        allHabits = allHabits.concat(habits.evening.map(h => ({...h, routineType: 'evening'})));
    }

    // Search filter
    if (settingsSearch.trim()) {
        const term = settingsSearch.toLowerCase();
        allHabits = allHabits.filter(h => h.name.toLowerCase().includes(term));
    }

    if (allHabits.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No habits found</p></div>';
        return;
    }

    // 2. Group by Schedule
    const groups = {
        'daily': { label: 'Daily Habits', items: [] },
        'weekly_goal': { label: 'Weekly Goals', items: [] },
        'specific_days': { label: 'Specific Days', items: [] },
        'interval': { label: 'Interval / Custom', items: [] }
    };

    allHabits.forEach(habit => {
        const type = habit.schedule?.type || 'daily';
        if (groups[type]) {
            groups[type].items.push(habit);
        } else {
            groups['interval'].items.push(habit);
        }
    });

    // 3. Render Groups
    let html = '';
    Object.values(groups).forEach(group => {
        if (group.items.length > 0) {
            html += `
                <div class="settings-group">
                    <h3>${group.label}</h3>
                    <div class="settings-group-list">
                        ${group.items.map(habit => renderHabitCard(habit)).join('')}
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
    attachHabitCardListeners();
}

/**
 * Render a single habit card
 * @param {Object} habit - Habit object
 * @returns {string} HTML string
 */
function renderHabitCard(habit) {
    // Calculate concise schedule chip
    let scheduleChip = 'Daily';
    const s = habit.schedule || {type: 'daily'};
    if (s.type === 'weekly_goal') scheduleChip = `${s.timesPerWeek}x/week`;
    else if (s.type === 'specific_days') {
        const days = s.days || [];
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) scheduleChip = 'Weekdays';
        else if (days.length === 2 && days.includes(0) && days.includes(6)) scheduleChip = 'Weekends';
        else scheduleChip = days.map(d => DAY_SHORTS[d]).join('/');
    }
    else if (s.type === 'interval') {
        const intervalDays = s.intervalDays || 1;
        const startLabel = s.intervalStartDate ? ` from ${s.intervalStartDate}` : '';
        const skip = s.intervalSkipDays || [];
        const skipLabel = skip.length ? `, skip ${skip.map(d => DAY_SHORTS[d]).join('/')}` : '';
        scheduleChip = `Every ${intervalDays}d${startLabel}${skipLabel}`;
    }

    return `
        <div class="habit-card" draggable="true" data-id="${habit.id}" data-type="${habit.routineType}">
            <div class="drag-handle">&#9776;</div>
            <div class="habit-card-content">
                <div class="habit-card-top">
                    <span class="habit-card-name">${escapeHtml(habit.name)}</span>
                    <span class="habit-type-badge">${habit.routineType === 'morning' ? 'MORNING' : 'EVENING'}</span>
                </div>
                <div class="habit-card-details">
                    <span class="schedule-chip">${scheduleChip}</span>
                </div>
            </div>
            <div class="habit-card-actions">
                <button class="card-action-btn edit" data-id="${habit.id}" data-type="${habit.routineType}" title="Edit">&#9998;</button>
                <button class="card-action-btn delete" data-id="${habit.id}" title="Delete" style="color: var(--accent-danger);">&#128465;</button>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to habit cards
 */
function attachHabitCardListeners() {
    // Edit
    document.querySelectorAll('.card-action-btn.edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const habit = habits[type].find(h => h.id === btn.dataset.id);
            if (habit && openHabitModalCallback) {
                openHabitModalCallback(habit, type);
            }
        });
    });

    // Delete
    document.querySelectorAll('.card-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            if (openDeleteModalCallback) {
                openDeleteModalCallback(btn.dataset.id);
            }
        });
    });

    // Drag and Drop
    const cards = document.querySelectorAll('.habit-card');
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);

        // Touch events for mobile
        card.addEventListener('touchstart', handleTouchStart, { passive: false });
        card.addEventListener('touchmove', handleTouchMove, { passive: false });
        card.addEventListener('touchend', handleTouchEnd);
    });
}

// ========== DRAG AND DROP HANDLERS ==========

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = this.parentElement;
    // Ensure we are in the same container
    if (container !== draggedItem.parentElement) return;

    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement == null) {
        container.appendChild(draggedItem);
    } else {
        container.insertBefore(draggedItem, afterElement);
    }
}

function handleDrop(e) {
    e.preventDefault();
}

function handleDragEnd() {
    this.classList.remove('dragging');
    if (draggedItem) {
        const container = draggedItem.parentElement;
        saveReorder(container);
        draggedItem = null;
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.habit-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ========== TOUCH HANDLERS FOR MOBILE ==========

let touchStartY = 0;
let touchCurrentY = 0;

function handleTouchStart(e) {
    // Only start drag from drag handle
    if (!e.target.classList.contains('drag-handle')) return;

    draggedItem = this;
    touchStartY = e.touches[0].clientY;
    this.classList.add('dragging');
}

function handleTouchMove(e) {
    if (!draggedItem) return;
    e.preventDefault();

    touchCurrentY = e.touches[0].clientY;
    const container = draggedItem.parentElement;

    const afterElement = getDragAfterElement(container, touchCurrentY);
    if (afterElement == null) {
        container.appendChild(draggedItem);
    } else {
        container.insertBefore(draggedItem, afterElement);
    }
}

function handleTouchEnd() {
    if (!draggedItem) return;

    draggedItem.classList.remove('dragging');
    const container = draggedItem.parentElement;
    saveReorder(container);
    draggedItem = null;
}

// ========== SAVE REORDER ==========

async function saveReorder(container) {
    // 1. Get new ID order
    const cards = [...container.querySelectorAll('.habit-card')];
    const newIdOrder = cards.map(c => c.dataset.id);

    // 2. Find these habits in memory to get their current 'order' values
    const affectedHabits = [];
    [...habits.morning, ...habits.evening].forEach(h => {
        if (newIdOrder.includes(h.id)) {
            affectedHabits.push(h);
        }
    });

    // 3. Get available 'order' slots and sort them
    const availableOrders = affectedHabits.map(h => h.order).sort((a, b) => a - b);

    // 4. Map new order: Index 0 gets lowest order value, etc.
    const updates = [];
    newIdOrder.forEach((id, index) => {
        const order = availableOrders[index];
        const habit = affectedHabits.find(h => h.id === id);
        if (habit && habit.order !== order) {
            updates.push({ id, order });
        }
    });

    if (updates.length === 0) return;

    // 5. Batch update
    const db = getDb();
    const batch = writeBatch(db);
    updates.forEach(u => {
        const ref = doc(db, `users/${currentUser.uid}/habits`, u.id);
        batch.update(ref, { order: u.order });
    });

    await batch.commit();
}
