/**
 * A collection of generic utility functions.
 * @namespace utils
 */
const utils = {
    /**
     * Sanitizes user input to prevent XSS by escaping HTML characters.
     * @param {string} text - The text to sanitize.
     * @returns {string} The sanitized text.
     */
    sanitizeInput: function(text) {
        if (typeof text !== 'string') return text;
        const tempDiv = document.createElement('div');
        tempDiv.textContent = text;
        return tempDiv.innerHTML;
    },
    
    /**
     * Creates a debounced function that delays invoking `func` until after `delay` milliseconds
     * have elapsed since the last time the debounced function was invoked.
     * @param {Function} func - The function to debounce.
     * @param {number} delay - The number of milliseconds to delay.
     * @returns {Function} The new debounced function.
     */
    debounce: function(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    loadHighlightJS: function() {
        return new Promise((resolve, reject) => {
            if (window.hljs) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load highlight.js script.'));
            document.head.appendChild(script);
        });
    },
};