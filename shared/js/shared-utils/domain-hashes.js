/**
 * Sorted 32-bit FNV-1a hashes of domains, stored as base64 LEB128 varints of the gaps between consecutive hashes.
 * @typedef {Object} DomainHashes
 * @property {number} count - number of hashes
 * @property {string} data
 */

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
 * @param {string[]} domains
 * @returns {DomainHashes}
 */
export function encodeDomainHashes(domains) {
    const hashes = [...new Set(domains.map(fnv1a32))].sort((a, b) => a - b);
    let binary = '';
    let prev = 0;
    for (const hash of hashes) {
        let gap = hash - prev;
        prev = hash;
        while (gap >= 0x80) {
            binary += String.fromCharCode((gap % 0x80) | 0x80);
            gap = Math.floor(gap / 0x80);
        }
        binary += String.fromCharCode(gap);
    }
    return { count: hashes.length, data: globalThis.btoa(binary) };
}

/**
 * @param {DomainHashes} domainHashes
 * @returns {Uint32Array} sorted hashes
 * @throws {Error} when the data is malformed
 */
export function decodeDomainHashes(domainHashes) {
    const binary = globalThis.atob(domainHashes.data);
    const hashes = new Uint32Array(domainHashes.count);
    let pos = 0;
    let prev = 0;
    for (let i = 0; i < domainHashes.count; i++) {
        let gap = 0;
        let shift = 0;
        let byte;
        do {
            byte = binary.charCodeAt(pos++);
            gap += (byte & 0x7f) * 2 ** shift;
            shift += 7;
        } while (byte & 0x80);
        prev += gap;
        hashes[i] = prev;
    }
    if (pos !== binary.length || prev > 0xffffffff) {
        throw new Error('Malformed domain hashes');
    }
    return hashes;
}

/**
 * @param {Uint32Array} sorted
 * @param {number} hash
 * @returns {boolean}
 */
export function containsHash(sorted, hash) {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] < hash) {
            lo = mid + 1;
        } else if (sorted[mid] > hash) {
            hi = mid - 1;
        } else {
            return true;
        }
    }
    return false;
}
