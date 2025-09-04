/**
 * @jest-environment jsdom
 */

const { ReadmeRules } = require('../src/modules/rules.js');

describe('rules.js', () => {
    it('should export a ReadmeRules object', () => {
        expect(ReadmeRules).toBeDefined();
        expect(typeof ReadmeRules).toBe('object');
    });

    it('should have a non-empty content property which is a string', () => {
        expect(typeof ReadmeRules.content).toBe('string');
        expect(ReadmeRules.content.length).toBeGreaterThan(100); // Check for substantial content
    });

    it('should contain key phrases about README best practices', () => {
        expect(ReadmeRules.content).toContain('The Anatomy of a Great README');
        expect(ReadmeRules.content).toContain('Instant Gratification Section');
        expect(ReadmeRules.content).toContain('Your README should make someone think:');
    });
});