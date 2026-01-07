// ========== SCREEN MANAGEMENT ==========
// Functions for showing/hiding screens

// List of all screen names
const SCREENS = ['loading', 'auth', 'signup', 'main', 'dashboard', 'mindset', 'insights', 'settings', 'onboarding'];
const screenScrollPositions = {};

/**
 * Show a specific screen and hide all others
 * @param {string} screenName - Name of the screen to show
 */
export function showScreen(screenName) {
    const activeScreen = SCREENS.find(name => {
        const screen = document.getElementById(`${name}-screen`);
        return screen && screen.classList.contains('active');
    });
    if (activeScreen) {
        screenScrollPositions[activeScreen] = window.scrollY || 0;
    }

    SCREENS.forEach(name => {
        const screen = document.getElementById(`${name}-screen`);
        if (screen) {
            screen.classList.toggle('active', name === screenName);
        }
    });

    const savedScroll = screenScrollPositions[screenName] || 0;
    requestAnimationFrame(() => {
        window.scrollTo(0, savedScroll);
    });
}

/**
 * Show an error message to the user
 * @param {string} message - Error message to display
 */
export function showError(message) {
    // For now, use alert - could be replaced with toast
    alert(message);
}

/**
 * Update the loading status message
 * @param {string} message - Status message to display
 */
export function updateLoadingStatus(message) {
    const status = document.getElementById('loading-status');
    if (status) status.textContent = message;
}
