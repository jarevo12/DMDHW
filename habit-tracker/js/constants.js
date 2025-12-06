// ========== CONSTANTS ==========
// Shared constants used across multiple modules

// Day name arrays
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORTS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Schedule types
export const SCHEDULE_TYPES = {
    DAILY: 'daily',
    SPECIFIC_DAYS: 'specific_days',
    WEEKLY_GOAL: 'weekly_goal',
    INTERVAL: 'interval'
};

// Default morning habits for new users
export const DEFAULT_MORNING_HABITS = [
    "Stop alarm without snooze and get up",
    "Go to bathroom and wash face with soap",
    "Eat protein bar/fruit",
    "Look phone (only messages)",
    "5-10 minute stretching & get changed",
    "Go to the gym",
    "Complete scheduled gym session",
    "Go home, prepare breakfast & have shower",
    "Eat breakfast + phone (social/news)",
    "Get changed & go to uni"
];

// Default evening habits for new users
export const DEFAULT_EVENING_HABITS = [
    "Send messages to Adri",
    "Check calendar + gym session next day",
    "Set up alarm & Airplane mode",
    "Prepare bag & clothes for next day",
    "Wash face + apply Roche Possay",
    "Take pill",
    "Read 5-10 pages book",
    "Turn lights off"
];
