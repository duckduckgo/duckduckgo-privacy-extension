import { base64ToBytes, fnv1a32, hostnameFromUrl, someSuffix } from './suffix-walk.js';

/**
 * @param {Uint32Array} sorted
 * @param {number} value
 */
function contains(sorted, value) {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const v = sorted[mid];
        if (v < value) {
            lo = mid + 1;
        } else if (v > value) {
            hi = mid - 1;
        } else {
            return true;
        }
    }
    return false;
}

/**
 * Decodes the hash list. 'raw' is little-endian uint32s; 'delta' is LEB128 varints of the gaps between sorted hashes.
 * @param {{ encoding: 'raw' | 'delta', count: number, data: string }} data
 * @returns {Uint32Array}
 */
function decode(data) {
    const bytes = base64ToBytes(data.data);
    const hashes = new Uint32Array(data.count);
    if (data.encoding === 'raw') {
        const view = new DataView(bytes.buffer);
        for (let i = 0; i < data.count; i++) {
            hashes[i] = view.getUint32(i * 4, true);
        }
        return hashes;
    }
    let pos = 0;
    let prev = 0;
    for (let i = 0; i < data.count; i++) {
        let gap = 0;
        let shift = 0;
        let byte;
        do {
            byte = bytes[pos++];
            gap += (byte & 0x7f) * 2 ** shift;
            shift += 7;
        } while (byte & 0x80);
        prev += gap;
        hashes[i] = prev;
    }
    return hashes;
}

/** Option 3: sorted array of 32-bit FNV-1a hashes of member domains, binary searched for each hostname suffix. */
export function createHostMatcher(data) {
    const hashes = decode(data);
    return (hostname) => someSuffix(hostname, (suffix) => contains(hashes, fnv1a32(suffix)));
}

export function createSiteRankLookup(data) {
    const matches = createHostMatcher(data);
    return (url) => {
        const hostname = hostnameFromUrl(url);
        return hostname && matches(hostname) ? 'top10k' : 'other';
    };
}
