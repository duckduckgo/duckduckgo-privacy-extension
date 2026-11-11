/**
 * Sorted 32-bit FNV-1a hashes of domains, stored as base64 LEB128 varints of the deltas between consecutive hashes.
 * https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
 * @typedef {Object} DomainHashes
 * @property {number} count - number of hashes, needed because the data has no end marker
 * @property {string} data - base64 of the encoded deltas
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
 * Hashes and sorts the domains, then writes the delta from each hash to the previous one (the first from 0) in 7-bit chunks, lowest first. The top bit is set on every byte, except the last. Deltas are smaller than the hashes, so most take 3 bytes instead of 4.
 *
 * Deltas can reach 2^32 - 1, past the signed 32-bit range of JS bitwise operators, so `%` and `Math.floor` do the splitting. Domains with the same hash are stored once, so `count` can be less than `domains.length`.
 * @param {string[]} domains
 * @returns {DomainHashes}
 */
export function encodeDomainHashes(domains) {
    const hashes = [...new Set(domains.map(fnv1a32))].sort((a, b) => a - b);
    let binary = '';
    let prev = 0;
    for (const hash of hashes) {
        let delta = hash - prev;
        prev = hash;
        while (delta >= 0x80) {
            binary += String.fromCharCode((delta % 0x80) | 0x80);
            delta = Math.floor(delta / 0x80);
        }
        binary += String.fromCharCode(delta);
    }
    return { count: hashes.length, data: globalThis.btoa(binary) };
}

/**
 * Reverses `encodeDomainHashes`: reads `count` deltas and adds each to a running total. Uses `* 2 ** shift` instead of `<<` because of the signed 32-bit range of JS bitwise operators.
 * @param {DomainHashes} domainHashes
 * @returns {Uint32Array} sorted hashes
 * @throws {Error} when the data is malformed: bytes left over or missing for `count`, or a total past 2^32 - 1
 */
export function decodeDomainHashes(domainHashes) {
    const binary = globalThis.atob(domainHashes.data);
    const hashes = new Uint32Array(domainHashes.count);
    let pos = 0;
    let prev = 0;
    for (let i = 0; i < domainHashes.count; i++) {
        let delta = 0;
        let shift = 0;
        let byte;
        do {
            byte = binary.charCodeAt(pos++);
            delta += (byte & 0x7f) * 2 ** shift;
            shift += 7;
        } while (byte & 0x80);
        prev += delta;
        hashes[i] = prev;
    }
    if (pos !== binary.length || prev > 0xffffffff) {
        throw new Error('Malformed domain hashes');
    }
    return hashes;
}

/**
 * Binary search, so the hashes can stay in a `Uint32Array` (4 bytes each) instead of a `Set`.
 * @param {Uint32Array} sorted - ascending, as returned by `decodeDomainHashes`
 * @param {number} hash - unsigned, as returned by `fnv1a32`
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
