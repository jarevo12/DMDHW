// ========== MINDSET UI ==========
// Handles mindset daily pill, reflections, and journal

import {
    getDb,
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp
} from './firebase-init.js';
import { currentUser, currentDate, accountCreatedAt, setCurrentDate } from './state.js';
import { formatDate } from './utils.js';
import { subscribeToEntry } from './entries.js';
import { updateDateDisplay } from './ui/progress.js';
import { renderHabits } from './ui/habits-ui.js';

const MINDSET_DAYS = [
    {
        quote: "Here's the big challenge of life. You can have more than you've got because you can become more than you are.",
        authorName: 'Jim Rohn',
        authorRole: 'Entrepreneur and motivational speaker'
    },
    {
        quote: 'Nothing changes if nothing changes, man.',
        authorName: 'David Goggins',
        authorRole: 'Navy Seal and World Record Holder'
    },
    {
        quote: "You're going to look back at any destination and realize that it was a 99.9% journey and only one day of celebrating achieving the thing.",
        authorName: 'Alex Hormozi',
        authorRole: 'Entrepreneur and investor'
    },
    {
        quote: 'One of the big thrusts for success is to come up with a strong enough why. If the why is powerful, the how is easy.',
        authorName: 'Jim Rohn',
        authorRole: 'Entrepreneur and motivational speaker'
    },
    {
        quote: "Playing out the fear... that fear is a mile wide and an inch deep... If you actually take the step and realize that it's not that deep... you can keep walking through it.",
        authorName: 'Alex Hormozi',
        authorRole: 'Entrepreneur and investor'
    },
    {
        quote: "Yeah, it's crazy to sometimes think like, what can happen if we decide that that I am qualified. What happens when I decide for myself that I'm going to do something different?",
        authorName: 'Alex Hormozi',
        authorRole: 'Entrepreneur and investor'
    },
    {
        quote: 'But if you do something repeatedly over and over, you develop a habit. So most people are in the habit of looking for easy ways to get the things they want.',
        authorName: 'Brian Tracy',
        authorRole: 'Motivational public speaker and self-development author'
    },
    {
        quote: "If you don't change what you're doing and how you do it, nothing else will change.",
        authorName: 'Jim Rohn',
        authorRole: 'Entrepreneur and motivational speaker'
    },
    {
        quote: "I've made huge developments while I was staying up until four in the morning... You can make huge developments... while you're doing a nine to five.",
        authorName: 'Chris Williamson',
        authorRole: 'Podcaster and club promoter'
    },
    {
        quote: "People don't understand it is you against you. The only person that gets in your way is you. Nobody else, YOU!.",
        authorName: 'David Goggins',
        authorRole: 'Navy Seal and World Record Holder'
    }
];

const mindsetCalendarState = {
    isOpen: false,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

let currentRating = 0;
let journalEntries = [];
let journalSort = 'date';
let toastVisibleUntil = 0;
let toastTimeoutId = null;
const TOAST_DURATION_MS = 10000;

let elements = null;

function parseDateString(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function getStartDate() {
    if (accountCreatedAt) {
        const createdAt = new Date(accountCreatedAt);
        if (!Number.isNaN(createdAt.getTime())) {
            return new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
        }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getMindsetDayInfo(date) {
    const startDate = getStartDate();
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = targetDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const dayIndex = diffDays + 1;
    const normalizedIndex = ((dayIndex - 1) % MINDSET_DAYS.length + MINDSET_DAYS.length) % MINDSET_DAYS.length + 1;
    const isBeyondInitialSet = dayIndex > MINDSET_DAYS.length;
    const dayInfo = isBeyondInitialSet
        ? {
            quote: 'New quotes coming.',
            authorName: 'Stay tuned',
            authorRole: 'More mindset drops soon'
        }
        : MINDSET_DAYS[normalizedIndex - 1];

    return {
        ...dayInfo,
        dayIndex,
        normalizedIndex
    };
}

function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();
}

function updateMindsetQuote() {
    if (!elements) return;
    const dayInfo = getMindsetDayInfo(currentDate);

    elements.quoteText.textContent = dayInfo.quote || '';
    elements.authorName.textContent = dayInfo.authorName || '';
    elements.authorRole.textContent = dayInfo.authorRole || '';
    elements.authorAvatar.textContent = getInitials(dayInfo.authorName);
}

function setRating(value) {
    currentRating = value;
    elements.stars.forEach((star, index) => {
        star.classList.toggle('active', index < value);
    });
}

function updateAnswerState(input, badge) {
    const hasContent = input.value.trim().length > 0;
    badge.classList.toggle('answered', hasContent);
    input.classList.toggle('has-content', hasContent);
}

function resetSaveState() {
    elements.saveButton.textContent = 'Save to Journal';
    elements.saveButton.style.background = '';
    elements.saveButton.style.color = '';
    elements.saveButton.classList.remove('disabled');
}

function scheduleToastReset() {
    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }
    const remaining = toastVisibleUntil - Date.now();
    if (remaining <= 0) {
        resetSaveState();
        return;
    }
    toastTimeoutId = setTimeout(() => {
        if (Date.now() >= toastVisibleUntil) {
            resetSaveState();
        }
    }, remaining);
}

export function updateMindsetFromEntry(entry) {
    if (!elements) return;

    updateMindsetQuote();
    updateMindsetDateDisplay();

    const mindset = entry?.mindset || null;
    setRating(mindset?.rating || 0);
    elements.reflectInput.value = mindset?.reflect || '';
    elements.actInput.value = mindset?.act || '';

    updateAnswerState(elements.reflectInput, elements.reflectBadge);
    updateAnswerState(elements.actInput, elements.actBadge);
    if (Date.now() >= toastVisibleUntil) {
        resetSaveState();
    }
}

function updateMindsetDateDisplay() {
    if (!elements) return;
    const today = new Date();
    const isToday = formatDate(currentDate) === formatDate(today);

    if (elements.dateText) {
        if (isToday) {
            elements.dateText.textContent = 'Today';
        } else {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            elements.dateText.textContent = formatDate(currentDate) === formatDate(yesterday)
                ? 'Yesterday'
                : currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        }
    }

    if (elements.dateFull) {
        elements.dateFull.textContent = currentDate.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationString = creationDate ? formatDate(creationDate) : null;
    if (elements.prevDateBtn) {
        const disablePrev = creationString && formatDate(currentDate) <= creationString;
        elements.prevDateBtn.disabled = disablePrev;
        elements.prevDateBtn.style.opacity = disablePrev ? '0.3' : '1';
    }

    if (elements.nextDateBtn) {
        elements.nextDateBtn.disabled = false;
        elements.nextDateBtn.style.opacity = '1';
    }

    mindsetCalendarState.currentMonth = currentDate.getMonth();
    mindsetCalendarState.currentYear = currentDate.getFullYear();
}

function renderMindsetCalendar() {
    if (!elements) return;

    const monthDate = new Date(mindsetCalendarState.currentYear, mindsetCalendarState.currentMonth, 1);
    const lastDay = new Date(mindsetCalendarState.currentYear, mindsetCalendarState.currentMonth + 1, 0);
    const startDayOfWeek = monthDate.getDay();
    const today = formatDate(new Date());
    const selectedString = formatDate(currentDate);
    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationDateValid = creationDate && !Number.isNaN(creationDate.getTime());
    const creationDateOnly = creationDateValid
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate())
        : null;

    if (elements.calendarMonthYear) {
        elements.calendarMonthYear.textContent = monthDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push('<button class="calendar-day-btn empty" disabled></button>');
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateObj = new Date(mindsetCalendarState.currentYear, mindsetCalendarState.currentMonth, day);
        const dateString = formatDate(dateObj);
        const isToday = dateString === today;
        const isSelected = dateString === selectedString;
        const isBeforeCreation = creationDateOnly ? dateObj < creationDateOnly : false;

        let classes = 'calendar-day-btn';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        if (isBeforeCreation) classes += ' before-account';

        days.push(`
            <button
                class="${classes}"
                data-date="${dateString}"
                ${isBeforeCreation ? 'disabled' : ''}
            >
                ${day}
            </button>
        `);
    }

    elements.calendarDays.innerHTML = days.join('');
    elements.calendarDays.querySelectorAll('button[data-date]').forEach(button => {
        button.addEventListener('click', () => {
            selectMindsetDate(button.dataset.date);
        });
    });

    if (elements.prevMonthBtn) {
        if (!creationDateOnly) {
            elements.prevMonthBtn.disabled = false;
        } else {
            const currentMonthDate = new Date(mindsetCalendarState.currentYear, mindsetCalendarState.currentMonth, 1);
            const earliestMonthDate = new Date(creationDateOnly.getFullYear(), creationDateOnly.getMonth(), 1);
            elements.prevMonthBtn.disabled = currentMonthDate <= earliestMonthDate;
        }
    }

    if (elements.nextMonthBtn) {
        elements.nextMonthBtn.disabled = false;
    }
}

function toggleMindsetCalendar() {
    if (!elements) return;
    mindsetCalendarState.isOpen = !mindsetCalendarState.isOpen;
    elements.calendarPicker.classList.toggle('hidden', !mindsetCalendarState.isOpen);
    elements.toggleCalendarBtn.classList.toggle('active', mindsetCalendarState.isOpen);
    if (mindsetCalendarState.isOpen) {
        renderMindsetCalendar();
    }
}

function closeMindsetCalendar() {
    mindsetCalendarState.isOpen = false;
    elements.calendarPicker.classList.add('hidden');
    elements.toggleCalendarBtn.classList.remove('active');
}

function selectMindsetDate(dateString) {
    setCurrentDate(parseDateString(dateString));
    updateDateDisplay();
    updateMindsetDateDisplay();
    updateMindsetQuote();
    renderHabits();
    subscribeToEntry();
    closeMindsetCalendar();
}

function previousMindsetMonth() {
    let newMonth = mindsetCalendarState.currentMonth - 1;
    let newYear = mindsetCalendarState.currentYear;

    if (newMonth < 0) {
        newMonth = 11;
        newYear--;
    }

    const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
    const creationDateValid = creationDate && !Number.isNaN(creationDate.getTime());
    const earliestMonthDate = creationDateValid
        ? new Date(creationDate.getFullYear(), creationDate.getMonth(), 1)
        : null;

    const candidateMonthDate = new Date(newYear, newMonth, 1);
    if (earliestMonthDate && candidateMonthDate < earliestMonthDate) {
        return;
    }

    mindsetCalendarState.currentMonth = newMonth;
    mindsetCalendarState.currentYear = newYear;
    renderMindsetCalendar();
}

function nextMindsetMonth() {
    let newMonth = mindsetCalendarState.currentMonth + 1;
    let newYear = mindsetCalendarState.currentYear;

    if (newMonth > 11) {
        newMonth = 0;
        newYear++;
    }

    mindsetCalendarState.currentMonth = newMonth;
    mindsetCalendarState.currentYear = newYear;
    renderMindsetCalendar();
}

async function saveMindsetEntry() {
    if (!currentUser) return;

    const reflect = elements.reflectInput.value.trim();
    const act = elements.actInput.value.trim();
    const hasInput = currentRating > 0 || reflect.length > 0 || act.length > 0;

    if (!hasInput) {
        return;
    }

    const db = getDb();
    const dateString = formatDate(currentDate);
    const entryRef = doc(db, `users/${currentUser.uid}/entries`, dateString);
    const dayInfo = getMindsetDayInfo(currentDate);

    await setDoc(entryRef, {
        date: dateString,
        mindset: {
            rating: currentRating,
            reflect,
            act,
            quote: dayInfo.quote,
            authorName: dayInfo.authorName,
            authorRole: dayInfo.authorRole,
            dayIndex: dayInfo.dayIndex,
            updatedAt: serverTimestamp()
        }
    }, { merge: true });

    elements.saveButton.textContent = 'Good Work, your reflections have been saved!';
    elements.saveButton.style.background = 'var(--accent-success)';
    elements.saveButton.style.color = 'var(--bg-primary)';

    toastVisibleUntil = Date.now() + TOAST_DURATION_MS;
    scheduleToastReset();

    if (elements.journalPage.classList.contains('active')) {
        await loadJournalEntries();
    }
}

function formatJournalDate(dateString) {
    const date = parseDateString(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function renderJournalList() {
    const list = elements.journalList;
    if (!list) return;

    if (journalEntries.length === 0) {
        list.innerHTML = '<div class="mindset-empty-state">No journal entries yet.</div>';
        return;
    }

    list.innerHTML = journalEntries.map(entry => {
        const stars = Array.from({ length: 5 }, (_, index) => {
            const isEmpty = index + 1 > (entry.rating || 0);
            return `<span class="star-icon${isEmpty ? ' empty' : ''}">&#9733;</span>`;
        }).join('');

        return `
            <div class="mindset-journal-entry" data-entry-id="${entry.id}">
                <div class="mindset-entry-header">
                    <span class="mindset-entry-date">${formatJournalDate(entry.id)}</span>
                    <div class="mindset-entry-rating">${stars}</div>
                </div>
                <p class="mindset-entry-quote">"${entry.quote || ''}"</p>
                <span class="mindset-entry-author">${entry.authorName || ''}</span>
            </div>
        `;
    }).join('');
}

function sortJournalEntries(entries) {
    const sorted = [...entries];
    if (journalSort === 'author') {
        sorted.sort((a, b) => (a.authorName || '').localeCompare(b.authorName || ''));
    } else if (journalSort === 'rating') {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
        sorted.sort((a, b) => parseDateString(b.id) - parseDateString(a.id));
    }
    return sorted;
}

async function loadJournalEntries() {
    if (!currentUser) return;

    const db = getDb();
    const entriesRef = collection(db, `users/${currentUser.uid}/entries`);
    const entriesSnapshot = await getDocs(entriesRef);
    const entries = [];

    entriesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const mindset = data.mindset;
        if (!mindset) return;

        const rating = mindset.rating || 0;
        const reflect = mindset.reflect || '';
        const act = mindset.act || '';
        if (!rating && !reflect && !act) return;

        const fallback = getMindsetDayInfo(parseDateString(docSnap.id));

        entries.push({
            id: docSnap.id,
            rating,
            reflect,
            act,
            quote: mindset.quote || fallback.quote,
            authorName: mindset.authorName || fallback.authorName,
            authorRole: mindset.authorRole || fallback.authorRole
        });
    });

    journalEntries = sortJournalEntries(entries);
    renderJournalList();
}

function openJournal() {
    elements.journalPage.classList.add('active');
    elements.journalPage.setAttribute('aria-hidden', 'false');
    elements.screen.classList.add('mindset-journal-open');
    loadJournalEntries();
}

function closeJournal() {
    elements.journalPage.classList.remove('active');
    elements.journalPage.setAttribute('aria-hidden', 'true');
    elements.screen.classList.remove('mindset-journal-open');
}

function openEntryDetail(entry) {
    elements.entryDetail.classList.add('active');
    elements.entryDetail.setAttribute('aria-hidden', 'false');
    elements.screen.classList.add('mindset-journal-open');

    const hasReflect = Boolean(entry.reflect && entry.reflect.trim());
    const hasAct = Boolean(entry.act && entry.act.trim());

    elements.detailDate.textContent = formatJournalDate(entry.id);
    elements.detailQuote.textContent = `"${entry.quote || ''}"`;
    elements.detailAuthorName.textContent = entry.authorName || '';
    elements.detailAuthorRole.textContent = entry.authorRole || '';

    elements.detailReflect.textContent = entry.reflect || '';
    elements.detailAct.textContent = entry.act || '';

    elements.detailReflectItem.style.display = hasReflect ? 'block' : 'none';
    elements.detailActItem.style.display = hasAct ? 'block' : 'none';
    elements.detailResponses.style.display = (hasReflect || hasAct) ? 'block' : 'none';

    elements.detailRating.innerHTML = Array.from({ length: 5 }, (_, index) => {
        const isEmpty = index + 1 > (entry.rating || 0);
        return `<span class="star-icon${isEmpty ? ' empty' : ''}">&#9733;</span>`;
    }).join('');
}

function closeEntryDetail() {
    elements.entryDetail.classList.remove('active');
    elements.entryDetail.setAttribute('aria-hidden', 'true');
    if (!elements.journalPage.classList.contains('active')) {
        elements.screen.classList.remove('mindset-journal-open');
    }
}

function handleJournalListClick(event) {
    const entryEl = event.target.closest('.mindset-journal-entry');
    if (!entryEl) return;
    const entryId = entryEl.dataset.entryId;
    const entry = journalEntries.find(item => item.id === entryId);
    if (entry) {
        openEntryDetail(entry);
    }
}

function setupStarInteractions() {
    elements.stars.forEach((star, index) => {
        star.addEventListener('mouseenter', () => {
            elements.stars.forEach((s, i) => {
                s.classList.toggle('preview', i <= index);
            });
        });

        star.addEventListener('mouseleave', () => {
            elements.stars.forEach(s => s.classList.remove('preview'));
        });

        star.addEventListener('click', () => {
            const value = Number.parseInt(star.dataset.value, 10);
            setRating(value);
            star.style.transform = 'scale(1.3)';
            setTimeout(() => {
                star.style.transform = '';
            }, 150);
        });
    });

    elements.starRating.addEventListener('mouseleave', () => {
        elements.stars.forEach(s => s.classList.remove('preview'));
    });
}

export function refreshMindsetView() {
    if (!elements) return;
    updateMindsetQuote();
    updateMindsetDateDisplay();
    renderMindsetCalendar();
}

export function initMindset() {
    const quoteText = document.getElementById('mindset-quote-text');
    if (!quoteText) return;

    elements = {
        quoteText,
        screen: document.getElementById('mindset-screen'),
        authorName: document.getElementById('mindset-author-name'),
        authorRole: document.getElementById('mindset-author-role'),
        authorAvatar: document.getElementById('mindset-author-avatar'),
        starRating: document.getElementById('mindset-star-rating'),
        stars: Array.from(document.querySelectorAll('#mindset-star-rating .mindset-star')),
        reflectInput: document.getElementById('mindset-reflect-input'),
        actInput: document.getElementById('mindset-act-input'),
        reflectBadge: document.getElementById('mindset-reflect-badge'),
        actBadge: document.getElementById('mindset-act-badge'),
        saveButton: document.getElementById('mindset-save-btn'),
        journalToggle: document.getElementById('mindset-journal-toggle'),
        journalPage: document.getElementById('mindset-journal-page'),
        journalBack: document.getElementById('mindset-journal-back'),
        journalList: document.getElementById('mindset-journal-list'),
        entryDetail: document.getElementById('mindset-entry-detail'),
        detailBack: document.getElementById('mindset-detail-back'),
        detailDate: document.getElementById('mindset-detail-date'),
        detailRating: document.getElementById('mindset-detail-rating'),
        detailQuote: document.getElementById('mindset-detail-quote'),
        detailAuthorName: document.getElementById('mindset-detail-author-name'),
        detailAuthorRole: document.getElementById('mindset-detail-author-role'),
        detailReflect: document.getElementById('mindset-detail-reflect'),
        detailAct: document.getElementById('mindset-detail-act'),
        detailReflectItem: document.getElementById('mindset-detail-reflect-item'),
        detailActItem: document.getElementById('mindset-detail-act-item'),
        detailResponses: document.getElementById('mindset-detail-responses'),
        toggleCalendarBtn: document.getElementById('mindset-toggle-calendar'),
        prevDateBtn: document.getElementById('mindset-prev-date'),
        nextDateBtn: document.getElementById('mindset-next-date'),
        todayBtn: document.getElementById('mindset-today-btn'),
        dateText: document.querySelector('#mindset-current-date .date-text'),
        dateFull: document.querySelector('#mindset-current-date .date-full'),
        calendarPicker: document.getElementById('mindset-calendar-picker'),
        calendarMonthYear: document.getElementById('mindset-calendar-month-year'),
        calendarDays: document.getElementById('mindset-calendar-days'),
        prevMonthBtn: document.getElementById('mindset-prev-month'),
        nextMonthBtn: document.getElementById('mindset-next-month')
    };

    setupStarInteractions();

    elements.reflectInput.addEventListener('input', () => {
        updateAnswerState(elements.reflectInput, elements.reflectBadge);
    });

    elements.actInput.addEventListener('input', () => {
        updateAnswerState(elements.actInput, elements.actBadge);
    });

    elements.saveButton.addEventListener('click', () => {
        saveMindsetEntry();
    });

    elements.journalToggle.addEventListener('click', openJournal);
    elements.journalBack.addEventListener('click', closeJournal);
    elements.detailBack.addEventListener('click', closeEntryDetail);
    elements.journalList.addEventListener('click', handleJournalListClick);

    document.querySelectorAll('.mindset-filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.mindset-filter-tab').forEach(btn => btn.classList.remove('active'));
            tab.classList.add('active');
            journalSort = tab.dataset.filter;
            journalEntries = sortJournalEntries(journalEntries);
            renderJournalList();
        });
    });

    elements.toggleCalendarBtn.addEventListener('click', toggleMindsetCalendar);
    elements.todayBtn.addEventListener('click', () => {
        setCurrentDate(new Date());
        updateDateDisplay();
        updateMindsetDateDisplay();
        updateMindsetQuote();
        renderHabits();
        subscribeToEntry();
        closeMindsetCalendar();
    });

    elements.prevDateBtn.addEventListener('click', () => {
        const creationDate = accountCreatedAt ? new Date(accountCreatedAt) : null;
        const creationString = creationDate ? formatDate(creationDate) : null;
        const currentString = formatDate(currentDate);
        if (creationString && currentString === creationString) {
            return;
        }
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        if (creationString && formatDate(newDate) < creationString) {
            return;
        }
        setCurrentDate(newDate);
        updateDateDisplay();
        updateMindsetDateDisplay();
        updateMindsetQuote();
        renderHabits();
        subscribeToEntry();
    });

    elements.nextDateBtn.addEventListener('click', () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
        updateDateDisplay();
        updateMindsetDateDisplay();
        updateMindsetQuote();
        renderHabits();
        subscribeToEntry();
    });

    elements.prevMonthBtn.addEventListener('click', previousMindsetMonth);
    elements.nextMonthBtn.addEventListener('click', nextMindsetMonth);

    updateMindsetFromEntry(null);
    renderMindsetCalendar();
}
