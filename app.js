const THEME_STORAGE_KEY = 'theme';

function setPrompt(text) {
    document.getElementById('userInput').value = text;
}

function sendMessage() {
    const input = document.getElementById('userInput');
    const messages = document.getElementById('messages');
    if (!input.value.trim()) return;

    // Display user message
    const userDiv = document.createElement('div');
    userDiv.textContent = "You: " + input.value;
    messages.appendChild(userDiv);

    // Display demo notice
    const botDiv = document.createElement('div');
    botDiv.className = "bot-reply";
    botDiv.textContent = "Bot: This is a demo interface. No backend is connected, and no data is being processed.";
    messages.appendChild(botDiv);

    input.value = '';
    messages.scrollTop = messages.scrollHeight;
}

// Apply the given theme ("light" or "dark") to the page and update the toggle.
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.textContent = isDark ? 'Light mode' : 'Dark mode';
        toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    }
}

// Read the saved theme; returns "light", "dark", or null if unavailable/invalid.
function loadSavedTheme() {
    try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        return (saved === 'dark' || saved === 'light') ? saved : null;
    } catch (e) {
        return null;
    }
}

// Persist the theme; silently ignores storage failures.
function saveTheme(theme) {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
        // Storage unavailable: theme still applies for this session.
    }
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
    saveTheme(nextTheme);
}

function initTheme() {
    applyTheme(loadSavedTheme() || 'light');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}