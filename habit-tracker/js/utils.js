// ========== UTILITY FUNCTIONS ==========
// Helper functions used across multiple modules

/**
 * Format a date to YYYY-MM-DD string
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date string
 */
export function getTodayString() {
    return formatDate(new Date());
}
