/**
 * Coarse site popularity bucket, attached to CPM summary pixels.
 * @typedef {'top10k' | 'other'} SiteRankBucket
 */

/**
 * Top sites as sorted 32-bit FNV-1a hashes of their registrable domains, stored as base64 LEB128 varints of the gaps
 * between consecutive hashes.
 * @typedef {Object} TopSitesData
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
 * @param {string[]} domains - registrable domains
 * @returns {TopSitesData}
 */
export function encodeTopSites(domains) {
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
 * @param {TopSitesData} topSites
 * @returns {Uint32Array}
 */
function decodeTopSites(topSites) {
    const binary = globalThis.atob(topSites.data);
    const hashes = new Uint32Array(topSites.count);
    let pos = 0;
    let prev = 0;
    for (let i = 0; i < topSites.count; i++) {
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
    return hashes;
}

/**
 * @param {Uint32Array} sorted
 * @param {number} value
 * @returns {boolean}
 */
function contains(sorted, value) {
    let lo = 0;
    let hi = sorted.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid] < value) {
            lo = mid + 1;
        } else if (sorted[mid] > value) {
            hi = mid - 1;
        } else {
            return true;
        }
    }
    return false;
}

/**
 * @param {string} url
 * @returns {string} lowercase hostname without a trailing dot, or '' for URLs without one and for IP addresses
 */
function hostnameFromUrl(url) {
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
 * Create a lookup that maps a URL to its site rank bucket. The lookup is done on the device only.
 * Instead of finding the registrable domain with the Public Suffix List, it checks every suffix of the hostname with
 * at least two labels, so `www.example.co.uk` matches when `example.co.uk` is a top site.
 * @param {TopSitesData} topSites
 * @returns {((url: string) => SiteRankBucket) | undefined} undefined when there is no top site data
 */
export function createSiteRankLookup(topSites) {
    if (!topSites.count) {
        return undefined;
    }
    const hashes = decodeTopSites(topSites);
    return (url) => {
        const hostname = hostnameFromUrl(url);
        const last = hostname.lastIndexOf('.');
        if (last <= 0) {
            return 'other';
        }
        let start = hostname.lastIndexOf('.', last - 1);
        for (;;) {
            if (contains(hashes, fnv1a32(hostname.slice(start + 1)))) {
                return 'top10k';
            }
            if (start <= 0) {
                return 'other';
            }
            start = hostname.lastIndexOf('.', start - 1);
        }
    };
}
