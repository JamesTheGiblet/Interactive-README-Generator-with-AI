/**
 * @jest-environment jsdom
 */

const { analytics } = require('../src/modules/analytics.js');

describe('analytics.js', () => {
    let consoleLogSpy;

    beforeEach(() => {
        // Spy on console.log to check if it's called correctly without cluttering the test output.
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore the original console.log function after each test.
        consoleLogSpy.mockRestore();
    });

    it('should log the event name and data to the console', () => {
        const eventName = 'readme_generated';
        const eventData = { provider: 'openai', projectType: 'web-app' };

        analytics.trackEvent(eventName, eventData);

        expect(consoleLogSpy).toHaveBeenCalledWith(`[Analytics Event] ${eventName}:`, eventData);
    });

    it('should handle events with no additional data', () => {
        const eventName = 'app_initialized';

        analytics.trackEvent(eventName);

        expect(consoleLogSpy).toHaveBeenCalledWith(`[Analytics Event] ${eventName}:`, undefined);
    });
});