/**
 * @param {string} url
 * @returns {string} lowercase hostname without a trailing dot, or '' for URLs that have none or are IP addresses
 */
export function hostnameFromUrl(url) {
    let hostname;
    try {
        hostname = new URL(url).hostname;
    } catch {
        return '';
    }
    if (hostname.endsWith('.')) {
        hostname = hostname.slice(0, -1);
    }
    // IPv6 hosts keep their brackets; IPv4 hosts end in a numeric label
    if (hostname.startsWith('[') || /\.\d+$/.test(hostname)) {
        return '';
    }
    return hostname;
}

/**
 * Calls `has` on each suffix of the hostname with at least two labels, shortest first, and stops at the first match.
 * @param {string} hostname
 * @param {(suffix: string) => boolean} has
 * @returns {boolean}
 */
export function someSuffix(hostname, has) {
    const last = hostname.lastIndexOf('.');
    if (last <= 0) {
        return false;
    }
    let start = hostname.lastIndexOf('.', last - 1);
    for (;;) {
        if (has(hostname.slice(start + 1))) {
            return true;
        }
        if (start <= 0) {
            return false;
        }
        start = hostname.lastIndexOf('.', start - 1);
    }
}

/**
 * 32-bit FNV-1a over UTF-16 code units. Hostnames are ASCII (IDNs are punycode), so this equals FNV-1a over bytes.
 * @param {string} str
 * @returns {number}
 */
export function fnv1a32(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToBytes(base64) {
    const binaryString = globalThis.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
