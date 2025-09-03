/**
 * @file This module provides methods for encrypting and decrypting data on the client-side.
 * It uses the Web Crypto API for strong encryption (AES-GCM) when available,
 * and falls back to a simple XOR obfuscation method for older browsers.
 *
 * WARNING: Client-side encryption only offers limited protection. A determined attacker
 * with access to the client-side code can potentially compromise the data.
 * The truly secure solution is to use a backend proxy and never store sensitive
 * data like API keys on the client for extended periods.
 */
const SecurityModule = {
    /**
     * Generates a consistent, user-specific "password" from browser properties.
     * This is used for key derivation and is more secure than a hardcoded string.
     * @returns {string} The secret string.
     * @private
     */
    _getSecret: function() {
        return navigator.userAgent + (window.location.origin || '');
    },

    /**
     * Encrypts data using AES-GCM via the Web Crypto API.
     * @param {string} data The plaintext data to encrypt.
     * @returns {Promise<string>} A promise that resolves to the base64-encoded encrypted string.
     */
    async encryptData(data) {
        const password = this._getSecret();
        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API not available, falling back to less secure obfuscation.');
            return this.fallbackEncrypt(data, password);
        }

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            // Derive a key from the password using PBKDF2
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password), { name: 'PBKDF2' },
                false, ['deriveKey']
            );

            const salt = crypto.getRandomValues(new Uint8Array(16));

            const derivedKey = await crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            }, keyMaterial, { name: 'AES-GCM', length: 256 },
            true, ['encrypt']);

            // Generate a random Initialization Vector (IV)
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Encrypt the data
            const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv },
                derivedKey,
                dataBuffer
            );

            // Combine salt, IV, and encrypted data into a single buffer for storage
            const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

            // Return as a base64 string, prefixed to identify it as the new format
            return 'v2:' + btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            console.error('Web Crypto encryption failed, falling back to less secure obfuscation.', error);
            return this.fallbackEncrypt(data, password);
        }
    },

    /**
     * Decrypts data that was encrypted with `encryptData`.
     * @param {string} encryptedString The base64-encoded encrypted string.
     * @returns {Promise<string>} A promise that resolves to the original plaintext data.
     */
    async decryptData(encryptedString) {
        const password = this._getSecret();

        // Handle old format or fallback encrypted data
        if (!encryptedString || !encryptedString.startsWith('v2:')) {
            return this.fallbackDecrypt(encryptedString, password);
        }

        if (!window.crypto || !window.crypto.subtle) {
            console.warn('Web Crypto API not available for decryption.');
            return ''; // Cannot decrypt v2 without Web Crypto
        }

        try {
            const dataWithoutPrefix = encryptedString.substring(3);
            const combined = new Uint8Array(atob(dataWithoutPrefix).split('').map(c => c.charCodeAt(0)));

            // Extract salt, IV, and encrypted data from the combined buffer
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encryptedData = combined.slice(28);

            // Derive the key from the password and salt using PBKDF2
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password), { name: 'PBKDF2' },
                false, ['deriveKey']
            );

            const derivedKey = await crypto.subtle.deriveKey({
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            }, keyMaterial, { name: 'AES-GCM', length: 256 },
            true, ['decrypt']);

            // Decrypt the data
            const decryptedDataBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv },
                derivedKey,
                encryptedData
            );

            // Decode the decrypted buffer back to a string
            return new TextDecoder().decode(decryptedDataBuffer);

        } catch (error) {
            console.error('Web Crypto decryption failed. The data may be corrupt or from a different browser/session.', error);
            return ''; // Return empty string on failure to prevent using a faulty key
        }
    },

    /**
     * A fallback XOR obfuscation method for browsers without Web Crypto API.
     * @param {string} data The plaintext data.
     * @param {string} password The secret to use for obfuscation.
     * @returns {string} The base64-encoded obfuscated string.
     * @private
     */
    fallbackEncrypt(data, password) {
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ password.charCodeAt(i % password.length));
        }
        // Prefix with v1 to distinguish from un-prefixed old data from app.js
        return 'v1:' + btoa(result);
    },

    /**
     * A fallback de-obfuscation method that can handle multiple old formats.
     * @param {string} data The base64-encoded obfuscated string.
     * @param {string} password The secret to use for de-obfuscation.
     * @returns {string} The original plaintext data.
     * @private
     */
    fallbackDecrypt(data, password) {
        if (!data) return '';
        let obfuscated = data;
        
        // Handle v1 format (XOR with user agent)
        if (data.startsWith('v1:')) {
            obfuscated = data.substring(3);
        }

        try {
            const decodedText = atob(obfuscated);
            let result = '';
            for (let i = 0; i < decodedText.length; i++) {
                result += String.fromCharCode(decodedText.charCodeAt(i) ^ password.charCodeAt(i % password.length));
            }
            return result;
        } catch (e) {
            // This can happen if the data was the very old, unencoded, un-prefixed format from app.js
            // or if the base64 string is corrupt.
            console.warn("Could not deobfuscate data, it might be in an old format or corrupt.", e);
            // Try to decrypt with the original hardcoded key from app.js as a last resort for migration
            const OBFUSCATION_KEY = 'a-not-so-secret-key-for-obfuscation';
            try {
                const decodedText = atob(data);
                let result = '';
                for (let i = 0; i < decodedText.length; i++) {
                    result += String.fromCharCode(decodedText.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length));
                }
                return result;
            } catch (e2) {
                return ''; // Give up
            }
        }
    }
};
