/**
 * Manages theme switching and persistence.
 */
const theme = {
    init() {
        this.themeToggle = document.getElementById('theme-checkbox');
        if (!this.themeToggle) return;

        // The inline script in the <head> sets the initial theme to prevent FOUC.
        // This init function just needs to make sure the checkbox state matches the theme.
        this.updateCheckboxState();

        this.themeToggle.addEventListener('change', this.toggleTheme.bind(this));

        // Optional: Also listen for system preference changes.
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', this.handleSystemThemeChange.bind(this));
    },

    isDarkMode() {
        return document.documentElement.classList.contains('dark-theme');
    },

    updateCheckboxState() {
        if (this.themeToggle) {
            this.themeToggle.checked = this.isDarkMode();
        }
    },

    setTheme(isDark) {
        document.documentElement.classList.toggle('dark-theme', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        this.updateCheckboxState();
    },

    toggleTheme() {
        this.setTheme(!this.isDarkMode());
    },

    handleSystemThemeChange(e) {
        // Only apply system theme if no theme is explicitly set in localStorage
        if (!localStorage.getItem('theme')) {
            this.setTheme(e.matches);
        }
    }
};

// This is a placeholder for where you would initialize the module.
// In your main app.js, you would call `theme.init();`