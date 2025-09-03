// WARNING: This is obfuscation, not true encryption. It provides only minimal security.

// A determined attacker with access to the client-side code can easily reverse-engineer this.

// The truly secure solution is to use a backend proxy and never store API keys on the client.



/**

 * Obfuscates an API key using a simple XOR cipher. This is not a secure method of storage.

 * @param {string} key The API key to obfuscate.

 * @returns {string} The obfuscated key, base64 encoded.

 */

function obfuscateApiKey(key) {

    const salt = navigator.userAgent + window.location.origin;

    return btoa(key.split('').map((char, i) =>

        String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))

    ).join(''));

}



/**

 * De-obfuscates an API key that was obfuscated with obfuscateApiKey.

 * @param {string} obfuscated The obfuscated, base64 encoded key.

 * @returns {string} The original API key.

 */

function deobfuscateApiKey(obfuscated) {

    const salt = navigator.userAgent + window.location.origin;

    return atob(obfuscated).split('').map((char, i) =>

        String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))

    ).join('');

}