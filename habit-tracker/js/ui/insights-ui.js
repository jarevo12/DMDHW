// ========== INSIGHTS UI ==========
// UI rendering functions for the Smart Insights feature

import { escapeHtml } from '../utils.js';

// SVG Icons for insight types
const ICONS = {
    trend: `<svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`,
    correlation: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    pattern: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="2" x2="12" y2="22" opacity="0.5"></line><line x1="2" y1="12" x2="22" y2="12" opacity="0.5"></line></svg>`,
    anomaly: `<svg viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path></svg>`,
    sequence: `<svg viewBox="0 0 24 24"><circle cx="4" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="20" cy="12" r="2"></circle><line x1="6" y1="12" x2="10" y2="12"></line><line x1="14" y1="12" x2="18" y2="12"></line></svg>`,
    strength: `<svg viewBox="0 0 24 24"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path></svg>`
};

const INSIGHT_CATEGORIES = [
    { key: 'correlation', label: 'Correlation insights' },
    { key: 'pattern', label: 'Weekly pattern insights' },
    { key: 'trend', label: 'Trend insights' },
    { key: 'anomaly', label: 'Anomaly insights' },
    { key: 'sequence', label: 'Sequence insights' },
    { key: 'strength', label: 'Strength alerts' }
];

const INSIGHTS_SECTION_STORAGE_KEY = 'insightsSectionState';

// Chart instance
let trendChartInstance = null;

// ========== RENDER FUNCTIONS ==========

/**
 * Render the metrics grid
 */
export function renderMetrics(data) {
    const metrics = data.metrics;
    if (!metrics) return;

    // Trend
    const trendEl = document.getElementById('metric-trend');
    if (trendEl) {
        const trend = metrics.trend || 0;
        trendEl.textContent = trend > 0 ? `+${trend}%` : `${trend}%`;
        trendEl.className = 'metric-value ' + (trend >= 0 ? 'positive' : 'negative');
    }

    // Best day
    const bestDayEl = document.getElementById('metric-best-day');
    const bestRateEl = document.getElementById('metric-best-rate');
    if (bestDayEl && metrics.bestDay) {
        bestDayEl.textContent = metrics.bestDay.name || '--';
        if (bestRateEl) {
            bestRateEl.textContent = `${metrics.bestDay.rate || 0}% completion`;
        }
    }

    // Average rate
    const avgRateEl = document.getElementById('metric-avg-rate');
    if (avgRateEl) {
        avgRateEl.textContent = `${metrics.avgRate || 0}%`;
    }

    // Days analyzed
    const daysEl = document.getElementById('metric-days');
    if (daysEl) {
        daysEl.textContent = data.metadata?.totalDays || 0;
    }
}

function buildInsightCard(insight, options = {}) {
    const { showHeader = true } = options;
    const card = document.createElement('div');
    card.className = 'insight-card';

    const iconSvg = ICONS[insight.icon] || ICONS.trend;

    const headerMarkup = showHeader
        ? `
        <div class="insight-header">
            <span class="insight-icon">${iconSvg}</span>
            <span class="insight-type">${escapeHtml(insight.title)}</span>
        </div>
        `
        : '';

    card.innerHTML = `
        ${headerMarkup}
        <div class="insight-body">
            <p class="insight-text">${insight.text}</p>
            <p class="insight-tip">${escapeHtml(insight.tip)}</p>
        </div>
        <div class="insight-expand">
            <p>This insight is based on your habit data over the selected time period.</p>
        </div>
        <button class="expand-btn">+ EXPAND FOR DETAILS</button>
    `;

    const expandBtn = card.querySelector('.expand-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.toggle('expanded');
        });
    }

    card.addEventListener('click', () => {
        card.classList.toggle('expanded');
    });

    return card;
}

function bindInsightsSectionToggles(container) {
    if (!container) return;
    let savedState = {};
    try {
        savedState = JSON.parse(localStorage.getItem(INSIGHTS_SECTION_STORAGE_KEY) || '{}');
    } catch (error) {
        savedState = {};
    }

    const setSectionState = (section, isExpanded) => {
        section.classList.toggle('expanded', isExpanded);
        section.classList.toggle('collapsed', !isExpanded);
        const header = section.querySelector('h2');
        if (header) header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        if (isExpanded) {
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        }
    };

    container.querySelectorAll('.chart-section[data-collapsible="true"]').forEach(section => {
        const sectionId = section.dataset.sectionId;
        if (!sectionId || section.dataset.bound) return;
        const stored = savedState[sectionId];
        const isExpanded = typeof stored === 'boolean' ? stored : true;
        setSectionState(section, isExpanded);

        const header = section.querySelector('h2');
        if (header) {
            header.addEventListener('click', () => {
                const nextExpanded = !section.classList.contains('expanded');
                setSectionState(section, nextExpanded);
                savedState[sectionId] = nextExpanded;
                localStorage.setItem(INSIGHTS_SECTION_STORAGE_KEY, JSON.stringify(savedState));
            });
        }

        section.dataset.bound = 'true';
    });
}

/**
 * Render the insight cards
 */
export function renderInsightCards(insights, habitMap) {
    const container = document.getElementById('insights-container');
    if (!container) return;

    if (!insights || insights.length === 0) {
        container.innerHTML = '<div class="no-insights">No insights available yet. Keep tracking your habits!</div>';
        return;
    }

    container.innerHTML = '';

    const groupedByCategory = INSIGHT_CATEGORIES.reduce((acc, category) => {
        acc[category.key] = [];
        return acc;
    }, {});

    insights.forEach((insight) => {
        if (groupedByCategory[insight.type]) {
            groupedByCategory[insight.type].push(insight);
        }
    });

    INSIGHT_CATEGORIES.forEach((category) => {
        const items = groupedByCategory[category.key];
        if (!items || items.length === 0) return;

        const section = document.createElement('section');
        section.className = 'chart-section collapsible expanded insights-group';
        section.dataset.collapsible = 'true';
        section.dataset.sectionId = `insights-${category.key}`;
        section.innerHTML = `
            <h2>${category.label}</h2>
            <div class="section-body"></div>
        `;

        const sectionBody = section.querySelector('.section-body');
        const groupedByTitle = items.reduce((acc, item) => {
            const title = item.title || 'Insight';
            if (!acc[title]) acc[title] = [];
            acc[title].push(item);
            return acc;
        }, {});

        Object.entries(groupedByTitle).forEach(([title, list]) => {
            const subsection = document.createElement('div');
            subsection.className = 'insights-subsection';

            const header = document.createElement('div');
            header.className = 'insights-subsection-header insight-header';
            const headerIcon = ICONS[list[0]?.icon] || ICONS.trend;
            header.innerHTML = `
                <span class="insight-icon">${headerIcon}</span>
                <span class="insight-type">${escapeHtml(title)}</span>
            `;

            const cards = document.createElement('div');
            cards.className = 'insights-subsection-list';
            list.forEach(insight => {
                cards.appendChild(buildInsightCard(insight, { showHeader: false }));
            });

            subsection.appendChild(header);
            subsection.appendChild(cards);
            sectionBody.appendChild(subsection);
        });

        container.appendChild(section);
    });

    bindInsightsSectionToggles(container);
}

/**
 * Render the weekday pattern bar chart
 */
export function renderWeekdayPattern(weekdayData) {
    const container = document.getElementById('weekday-grid');
    if (!container || !weekdayData) return;

    container.innerHTML = '';
    container.dataset.type = weekdayData.type || 'morning';

    const rates = weekdayData.rates || [];
    if (rates.length === 0) return;

    const values = rates.filter(r => r.possible > 0).map(r => r.rate);
    const maxVal = Math.max(...values);

    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const grid = document.createElement('div');
    grid.className = 'weekday-grid';

    rates.forEach((dayData, index) => {
        const isUnavailable = dayData.possible === 0;
        const isBest = !isUnavailable && dayData.rate === maxVal && dayData.rate > 0;
        const barClass = isUnavailable ? 'na' : (isBest ? 'best' : 'normal');
        const heightValue = isUnavailable ? 100 : dayData.rate;
        const valueLabel = isUnavailable ? 'N/A' : `${dayData.rate}%`;

        const item = document.createElement('div');
        item.className = 'weekday-item';
        item.innerHTML = `
            <span class="weekday-label">${dayLabels[index]}</span>
            <div class="weekday-bar-container">
                <div class="weekday-bar ${barClass}" style="height: ${heightValue}%"></div>
            </div>
            <span class="weekday-value ${barClass}">${valueLabel}</span>
            ${isBest ? '<span class="weekday-badge best">BEST</span>' : ''}
        `;
        grid.appendChild(item);
    });

    const legend = document.createElement('div');
    legend.className = 'weekday-legend';
    legend.innerHTML = `
        <div class="weekday-legend-item">
            <span class="weekday-legend-swatch na"></span>
            <span>No scheduled habits</span>
        </div>
    `;

    container.appendChild(grid);
    container.appendChild(legend);
}

/**
 * Render the correlation matrix
 */
export function renderCorrelationMatrix(correlationsData, habitIds, habitMap) {
    const container = document.getElementById('correlation-matrix');
    const section = document.getElementById('correlation-section');

    if (!container) return;

    // Check if we have correlation data
    if (!correlationsData || correlationsData.insufficientData || correlationsData.insufficientHabits) {
        if (section) {
            section.style.display = 'block';
        }
        container.innerHTML = `
            <div class="data-notice" style="margin: 0;">
                <div class="data-notice-icon">&#128202;</div>
                <div class="data-notice-title">Collecting Data</div>
                <div class="data-notice-text">Need at least 21 days of data and 2+ habits for correlations.</div>
            </div>
        `;
        return;
    }

    const { correlations } = correlationsData;
    if (!correlations || correlations.length === 0 || !habitIds || habitIds.length < 2) {
        if (section) section.style.display = 'none';
        return;
    }

    if (section) section.style.display = 'block';

    // Get short habit names
    const shortNames = habitIds.map(id => {
        const name = habitMap[id]?.name || id;
        return name.substring(0, 4).toUpperCase();
    });

    const size = habitIds.length + 1;
    container.style.gridTemplateColumns = `repeat(${size}, 45px)`;
    container.innerHTML = '';

    // Header row - empty corner
    const emptyCell = document.createElement('div');
    emptyCell.className = 'matrix-cell header';
    container.appendChild(emptyCell);

    // Header row - habit names
    shortNames.forEach(name => {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell header';
        cell.textContent = name;
        container.appendChild(cell);
    });

    // Data rows
    habitIds.forEach((habitId, i) => {
        // Row header
        const rowHeader = document.createElement('div');
        rowHeader.className = 'matrix-cell header';
        rowHeader.textContent = shortNames[i];
        container.appendChild(rowHeader);

        // Data cells
        habitIds.forEach((_, j) => {
            const value = correlations[i][j];
            const cell = document.createElement('div');

            if (i === j) {
                cell.className = 'matrix-cell diagonal';
                cell.textContent = '1.0';
            } else {
                let cellClass = 'weak';
                if (value >= 0.4) cellClass = 'positive';
                else if (value <= -0.4) cellClass = 'negative';

                cell.className = `matrix-cell ${cellClass}`;
                cell.textContent = value.toFixed(2);
            }

            container.appendChild(cell);
        });
    });
}

/**
 * Render the trend chart using Chart.js
 */
export function renderTrendChart(trendData) {
    const canvas = document.getElementById('insights-trend-chart');
    if (!canvas || !trendData) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    const { labels, morning, evening } = trendData;
    if (!labels || labels.length === 0) return;

    // Format labels to show just day
    const formattedLabels = labels.map(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.getDate().toString();
    });

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: formattedLabels,
            datasets: [
                {
                    label: 'Morning',
                    data: morning,
                    borderColor: '#ccff00',
                    backgroundColor: 'rgba(204, 255, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0,
                    pointRadius: 3,
                    pointBackgroundColor: '#ccff00',
                    pointBorderColor: '#000',
                    pointBorderWidth: 1
                },
                {
                    label: 'Evening',
                    data: evening,
                    borderColor: '#6a00ff',
                    backgroundColor: 'rgba(106, 0, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0,
                    pointRadius: 3,
                    pointBackgroundColor: '#6a00ff',
                    pointBorderColor: '#000',
                    pointBorderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#000',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#fff',
                    borderWidth: 2,
                    padding: 12,
                    titleFont: {
                        family: 'Courier New',
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Courier New'
                    },
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw + '%';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: true,
                        borderColor: '#666'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Courier New',
                            size: 10
                        },
                        maxTicksLimit: 10
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: true,
                        borderColor: '#666'
                    },
                    ticks: {
                        color: '#666',
                        font: {
                            family: 'Courier New',
                            size: 10
                        },
                        callback: function(value) {
                            return value + '%';
                        },
                        stepSize: 20
                    }
                }
            },
            animation: {
                duration: 500
            }
        },
        plugins: [{
            id: 'goalLine',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const yAxis = chart.scales.y;
                const y = yAxis.getPixelForValue(80);

                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 2;
                ctx.moveTo(chart.chartArea.left, y);
                ctx.lineTo(chart.chartArea.right, y);
                ctx.stroke();
                ctx.restore();
            }
        }]
    });
}

/**
 * Render the habit strength progress bars
 */
export function renderHabitStrength(strengthData, habitMap, options = {}) {
    const {
        containerId = 'strength-list',
        filterType = null,
        streaksById = {},
        showStreaks = true,
        streakUnit = 'days'
    } = options;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!strengthData || strengthData.length === 0) {
        container.innerHTML = '<div class="no-insights">No habit strength data available.</div>';
        return;
    }

    container.innerHTML = '';

    let filtered = [...strengthData];
    if (filterType && filterType !== 'all' && habitMap) {
        filtered = filtered.filter(habit => {
            const habitId = habit.habitId || habit.id;
            return habitMap[habitId]?.type === filterType;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-insights">No habits to display.</div>';
        return;
    }

    // Preserve habit order from the main list
    const sorted = filtered.sort((a, b) => {
        const orderA = habitMap[a.habitId || a.id]?.order ?? 0;
        const orderB = habitMap[b.habitId || b.id]?.order ?? 0;
        return orderA - orderB;
    });

    sorted.forEach((habit, index) => {
        const item = document.createElement('div');
        item.className = 'strength-item';

        const statusDescriptions = {
            mastered: 'Rock solid. This habit is automatic!',
            strong: 'Good momentum. Keep showing up.',
            building: 'Gaining strength. Stay consistent.',
            fragile: 'Needs attention. Try smaller wins.'
        };

        const habitId = habit.habitId || habit.id;
        const habitStreaks = streaksById[habitId] || {};
        const currentStreak = Number.isFinite(habitStreaks.currentStreak) ? habitStreaks.currentStreak : 0;
        const bestStreak = Number.isFinite(habitStreaks.bestStreak) ? habitStreaks.bestStreak : 0;
        const streaksHtml = showStreaks ? `
            <div class="strength-streaks">
                <span class="streak-badge" title="Current streak">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                    </svg>
                    ${currentStreak} ${streakUnit}
                </span>
                <span class="streak-badge best" title="Best streak">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    ${bestStreak} ${streakUnit}
                </span>
            </div>
        ` : '';

        item.innerHTML = `
            <div class="strength-header">
                <span class="strength-name">${index + 1}. ${escapeHtml(habit.name)}</span>
                <span class="strength-status ${habit.status}">${habit.status.toUpperCase()}</span>
            </div>
            ${streaksHtml}
            <div class="strength-bar-container">
                <div class="strength-bar">
                    <div class="strength-fill ${habit.status}" style="width: ${habit.strength}%"></div>
                </div>
                <span class="strength-value">${habit.strength}%</span>
            </div>
            <p class="strength-description">${statusDescriptions[habit.status] || ''}</p>
        `;
        container.appendChild(item);
    });
}

/**
 * Render the data collection notice
 */
export function renderDataNotice(daysCollected, daysNeeded) {
    const notice = document.getElementById('insights-data-notice');
    const main = document.getElementById('insights-main');

    if (!notice || !main) return;

    notice.classList.remove('hidden');
    main.style.display = 'none';

    const progressFill = document.getElementById('data-progress-fill');
    const progressText = document.getElementById('data-progress-text');

    if (progressFill) {
        const percentage = Math.min((daysCollected / daysNeeded) * 100, 100);
        progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
        progressText.textContent = `${daysCollected}/${daysNeeded} days`;
    }
}

/**
 * Hide the data notice and show main content
 */
export function hideDataNotice() {
    const notice = document.getElementById('insights-data-notice');
    const main = document.getElementById('insights-main');

    if (notice) notice.classList.add('hidden');
    if (main) main.style.display = 'block';
}

/**
 * Show loading state
 */
export function showLoading() {
    const loading = document.getElementById('insights-loading');
    const main = document.getElementById('insights-main');
    const notice = document.getElementById('insights-data-notice');

    if (loading) loading.classList.remove('hidden');
    if (main) main.style.display = 'none';
    if (notice) notice.classList.add('hidden');
}

/**
 * Hide loading state
 */
export function hideLoading() {
    const loading = document.getElementById('insights-loading');
    if (loading) loading.classList.add('hidden');
}

/**
 * Set up UI event handlers
 */
export function setupInsightsUIHandlers(onPeriodChange, onTypeChange) {
    // Period toggle (7D / 30D / 90D)
    const periodToggle = document.getElementById('period-toggle');
    if (periodToggle) {
        periodToggle.addEventListener('click', (e) => {
            if (e.target.classList.contains('toggle-btn')) {
                periodToggle.querySelectorAll('.toggle-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');

                const period = parseInt(e.target.dataset.period, 10);
                if (onPeriodChange) onPeriodChange(period);
            }
        });
    }

    // Type toggle (Morning / Evening)
    const typeTabs = document.getElementById('insights-type-tabs');
    if (typeTabs) {
        typeTabs.querySelectorAll('.dash-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                console.log(`[Insights UI] Type tab clicked: ${type}, button text: ${btn.textContent.trim()}`);

                typeTabs.querySelectorAll('.dash-tab').forEach(tab => {
                    const isActive = tab === btn;
                    tab.classList.toggle('active', isActive);
                    tab.classList.toggle('inactive', !isActive);
                });

                console.log(`[Insights UI] Calling onTypeChange with: ${type}`);
                if (onTypeChange) onTypeChange(type);
            });
        });
    }
}

export function setInsightsToggleState(period, type) {
    const periodToggle = document.getElementById('period-toggle');
    if (periodToggle) {
        periodToggle.querySelectorAll('.toggle-btn').forEach(btn => {
            const isActive = Number(btn.dataset.period) === Number(period);
            btn.classList.toggle('active', isActive);
        });
    }

    const normalizedType = type === 'evening' ? 'evening' : 'morning';
    const typeTabs = document.getElementById('insights-type-tabs');
    if (typeTabs) {
        typeTabs.querySelectorAll('.dash-tab').forEach(btn => {
            const isActive = btn.dataset.type === normalizedType;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('inactive', !isActive);
        });
    }
}

/**
 * Render all insights UI
 */
export function renderAllInsights(results) {
    hideLoading();

    // Validate that results match the currently selected type in UI
    const selectedType = document.querySelector('#insights-type-tabs .dash-tab.active')?.dataset.type;
    const resultType = results.metadata?.type;

    console.log(`[Insights UI] renderAllInsights called: resultType=${resultType}, selectedType=${selectedType}`);

    // Log the actual habits being returned
    const habitIds = results.habitIds || [];
    const habitMap = results.habitMap || {};
    const habitTypesInResults = habitIds.reduce((acc, id) => {
        const t = habitMap[id]?.type || 'unknown';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
    }, {});
    console.log(`[Insights UI] Habits in results: count=${habitIds.length}, types=${JSON.stringify(habitTypesInResults)}`);

    if (selectedType && resultType && resultType !== 'all' && resultType !== selectedType) {
        console.log(`[Insights UI] BLOCKING RENDER: result type (${resultType}) doesn't match selected (${selectedType})`);
        return;
    }

    // Additional check: verify the habits in results match the expected type
    if (selectedType && habitIds.length > 0) {
        const wrongTypeHabits = habitIds.filter(id => habitMap[id]?.type !== selectedType);
        if (wrongTypeHabits.length > 0) {
            console.log(`[Insights UI] WARNING: ${wrongTypeHabits.length} habits don't match selected type ${selectedType}`);
            console.log(`[Insights UI] Wrong habits: ${wrongTypeHabits.map(id => `${habitMap[id]?.name}(${habitMap[id]?.type})`).join(', ')}`);
        }
    }

    if (results.insufficientData) {
        renderDataNotice(results.daysCollected, results.daysNeeded);
        return;
    }

    hideDataNotice();

    console.log(`[Insights UI] Proceeding with render for type=${resultType}`);
    renderMetrics(results);
    renderInsightCards(results.insights, results.habitMap);

    const debug = document.getElementById('insights-debug');
    if (debug) {
        const debugSelectedType = document.querySelector('#insights-type-tabs .dash-tab.active')?.dataset.type || 'unknown';
        const habitIds = results.habitIds || [];
        const habitMap = results.habitMap || {};
        const typeCounts = habitIds.reduce((acc, id) => {
            const habitType = habitMap[id]?.type || 'unknown';
            acc[habitType] = (acc[habitType] || 0) + 1;
            return acc;
        }, {});
        const sample = habitIds.slice(0, 4).map(id => {
            const habit = habitMap[id];
            const label = habit?.name || id;
            const habitType = habit?.type || 'unknown';
            return `${label}(${habitType})`;
        }).join(', ');
        const insightTypeCounts = (results.insights || []).reduce((acc, item) => {
            const insightType = item.type || 'unknown';
            acc[insightType] = (acc[insightType] || 0) + 1;
            return acc;
        }, {});
        const insightSamples = (results.insights || []).slice(0, 3).map(item => {
            const text = item.text || '';
            const clean = text.replace(/<[^>]+>/g, '');
            return clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
        });
        const strengthSample = results.debug?.strengthSample || [];
        const filteredSample = results.debug?.filteredHabitsSample || [];
        debug.textContent = [
            `DEBUG: results.type=${results.metadata?.type || 'n/a'} | selected=${debugSelectedType} | period=${results.metadata?.daysAnalyzed || results.metadata?.totalDays || 'n/a'}`,
            `DEBUG: habitIds=${habitIds.length} | types=${JSON.stringify(typeCounts)} | sample=${sample || 'n/a'}`,
            `DEBUG: insights=${(results.insights || []).length} | insightTypes=${JSON.stringify(insightTypeCounts)}`,
            `DEBUG: samples=${insightSamples.join(' || ')}`,
            `DEBUG: strengthSample=${strengthSample.join(' || ') || 'n/a'}`,
            `DEBUG: filteredSample=${filteredSample.join(' || ') || 'n/a'}`
        ].join('\n');
    }
}

/**
 * Destroy charts when leaving the screen
 */
export function destroyCharts() {
    if (trendChartInstance) {
        trendChartInstance.destroy();
        trendChartInstance = null;
    }
}
