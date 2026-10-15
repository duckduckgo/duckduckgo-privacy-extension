import { containsHash, decodeDomainHashes, fnv1a32 } from '../../shared-utils/domain-hashes';

/**
 * Coarse site popularity bucket, attached to CPM summary pixels.
 * @typedef {'top10k' | 'other'} SiteRankBucket
 */

/**
 * @param {string} url
 * @returns {string} lowercase hostname without a trailing dot, or '' for URLs without one
 */
function hostnameFromUrl(url) {
    let hostname;
    try {
        hostname = new URL(url).hostname;
    } catch {
        return '';
    }
    return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
}

/**
 * Checks every suffix of the hostname with at least two labels, so `www.example.co.uk` matches `example.co.uk`.
 * @param {import('../../shared-utils/domain-hashes').DomainHashes} topSites
 * @returns {((url: string) => SiteRankBucket) | undefined} undefined when there is no valid top site data
 */
export function createSiteRankLookup(topSites) {
    if (!topSites.count) {
        return undefined;
    }
    let hashes;
    try {
        hashes = decodeDomainHashes(topSites);
    } catch {
        // Bad data must not stop the background script from loading.
        return undefined;
    }
    return (url) => {
        const hostname = hostnameFromUrl(url);
        const last = hostname.lastIndexOf('.');
        if (last <= 0) {
            return 'other';
        }
        let start = hostname.lastIndexOf('.', last - 1);
        for (;;) {
            if (containsHash(hashes, fnv1a32(hostname.slice(start + 1)))) {
                return 'top10k';
            }
            if (start <= 0) {
                return 'other';
            }
            start = hostname.lastIndexOf('.', start - 1);
        }
    };
}
