/**
 * @jest-environment jsdom
 */

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
let mockObserverInstance;
mockIntersectionObserver.mockImplementation((callback, options) => {
    mockObserverInstance = {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
        // Helper to simulate intersection
        simulateIntersection: (entries) => {
            callback(entries, mockObserverInstance);
        },
    };
    return mockObserverInstance;
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock MutationObserver
const mockMutationObserver = jest.fn();
let mockMutationCallback;
mockMutationObserver.mockImplementation((callback) => {
    mockMutationCallback = callback;
    return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        // Helper to simulate mutation
        simulateMutation: () => {
            callback();
        }
    };
});
global.MutationObserver = mockMutationObserver;

const { PerformanceOptimizer } = require('../src/modules/performance.js');

describe('PerformanceOptimizer', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = `
            <div id="container">
                <img data-src="image1.jpg" alt="Image 1">
                <img src="image2.jpg" alt="Image 2">
                <img data-src="image3.png" alt="Image 3">
            </div>
            <div id="preview"></div>
        `;
    });

    describe('setupLazyLoading', () => {
        it('should observe all images with a data-src attribute', () => {
            const container = document.getElementById('container');
            PerformanceOptimizer.setupLazyLoading(container);

            expect(mockIntersectionObserver).toHaveBeenCalled();
            expect(mockObserverInstance.observe).toHaveBeenCalledTimes(2);
            expect(mockObserverInstance.observe).toHaveBeenCalledWith(document.querySelector('img[data-src="image1.jpg"]'));
            expect(mockObserverInstance.observe).toHaveBeenCalledWith(document.querySelector('img[data-src="image3.png"]'));
        });

        it('should set the src attribute and unobserve when an image is intersecting', () => {
            const container = document.getElementById('container');
            const image1 = container.querySelector('img[data-src="image1.jpg"]');
            PerformanceOptimizer.setupLazyLoading(container);

            // Simulate the intersection
            mockObserverInstance.simulateIntersection([{ target: image1, isIntersecting: true }]);

            expect(image1.src).toContain('image1.jpg');
            expect(image1.hasAttribute('data-src')).toBe(false);
            expect(mockObserverInstance.unobserve).toHaveBeenCalledWith(image1);
        });
    });

    describe('setupPreviewVirtualization', () => {
        it('should set up a MutationObserver on the preview element', () => {
            const preview = document.getElementById('preview');
            PerformanceOptimizer.setupPreviewVirtualization();

            expect(mockMutationObserver).toHaveBeenCalled();
            const observerInstance = mockMutationObserver.mock.results[0].value;
            expect(observerInstance.observe).toHaveBeenCalledWith(preview, { childList: true, subtree: true });
        });

        it('should call virtualizePreview when content changes and scrollHeight is large', () => {
            const virtualizeSpy = jest.spyOn(PerformanceOptimizer, 'virtualizePreview').mockImplementation(() => {});
            const preview = document.getElementById('preview');
            // Mock scrollHeight to be large
            Object.defineProperty(preview, 'scrollHeight', { value: 4000 });

            PerformanceOptimizer.setupPreviewVirtualization();
            
            // Simulate a mutation
            mockMutationCallback();

            expect(virtualizeSpy).toHaveBeenCalledWith(preview);
            virtualizeSpy.mockRestore();
        });
    });
});