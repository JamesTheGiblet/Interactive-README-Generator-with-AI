/**
 * @jest-environment jsdom
 */

const { SecurityModule } = require('../src/modules/security.js');

// Polyfill TextEncoder and TextDecoder for the jsdom environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// A mock for the Web Crypto API
const mockCrypto = {
    subtle: {
        importKey: jest.fn(),
        deriveKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
    },
    getRandomValues: jest.fn(buffer => {
        // Fill buffer with predictable, non-zero data for tests
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = i + 1;
        }
        return buffer;
    }),
};

describe('SecurityModule', () => {
    const originalCrypto = window.crypto;
    const originalNavigator = window.navigator;
    const plaintext = 'my-secret-api-key';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock navigator for consistent secret generation
        Object.defineProperty(window, 'navigator', {
            value: { userAgent: 'test-user-agent' },
            writable: true,
        });

        // Mock Web Crypto API by default for most tests
        Object.defineProperty(window, 'crypto', {
            value: mockCrypto,
            writable: true,
        });
    });

    afterAll(() => {
        // Restore original objects after all tests in this file
        window.crypto = originalCrypto;
        window.navigator = originalNavigator;
    });

    describe('with Web Crypto API', () => {
        it('should encrypt data using AES-GCM and prefix with v2', async () => {
            const mockKeyMaterial = { type: 'key-material' };
            const mockDerivedKey = { type: 'derived-key' };
            const encryptedBuffer = new TextEncoder().encode('encrypted-content').buffer;

            mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
            mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
            mockCrypto.subtle.encrypt.mockResolvedValue(encryptedBuffer);

            const encrypted = await SecurityModule.encryptData(plaintext);

            expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
            expect(mockCrypto.subtle.deriveKey).toHaveBeenCalled();
            expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
                { name: 'AES-GCM', iv: expect.any(Uint8Array) },
                mockDerivedKey,
                expect.any(Uint8Array)
            );
            expect(encrypted).toMatch(/^v2:/);
        });

        it('should decrypt v2 data using AES-GCM', async () => {
            const mockKeyMaterial = { type: 'key-material' };
            const mockDerivedKey = { type: 'derived-key' };
            const decryptedBuffer = new TextEncoder().encode(plaintext).buffer;

            mockCrypto.subtle.importKey.mockResolvedValue(mockKeyMaterial);
            mockCrypto.subtle.deriveKey.mockResolvedValue(mockDerivedKey);
            mockCrypto.subtle.decrypt.mockResolvedValue(decryptedBuffer);

            // Create a fake v2 encrypted string for the test
            const salt = new Uint8Array(16).fill(1);
            const iv = new Uint8Array(12).fill(2);
            const encryptedData = new Uint8Array(10).fill(3);
            const combined = new Uint8Array([...salt, ...iv, ...encryptedData]);
            const fakeV2String = 'v2:' + btoa(String.fromCharCode.apply(null, combined));

            const decrypted = await SecurityModule.decryptData(fakeV2String);

            expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
            expect(decrypted).toBe(plaintext);
        });

        it('should return an empty string if decryption fails', async () => {
            mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));
            const result = await SecurityModule.decryptData('v2:corrupt-data');
            expect(result).toBe('');
        });
    });

    describe('without Web Crypto API (Fallback)', () => {
        beforeEach(() => {
            // Remove the crypto API for these tests
            Object.defineProperty(window, 'crypto', {
                value: undefined,
                writable: true,
            });
        });

        it('should use fallback encryption and decryption for v1 format', async () => {
            const encrypted = await SecurityModule.encryptData(plaintext);
            expect(encrypted).toMatch(/^v1:/);
            expect(encrypted).not.toBe('v1:' + btoa(plaintext)); // Ensure it's actually changed

            const decrypted = await SecurityModule.decryptData(encrypted);
            expect(decrypted).toBe(plaintext);
        });
    });
});