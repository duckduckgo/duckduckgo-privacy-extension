import { getDomain } from 'tldts';
import jsbloom from '@duckduckgo/jsbloom';
import topSitesBloomData from '../../../data/bundled/cpm-top-sites-bloom.json';

/**
 * Coarse site popularity bucket, attached to CPM summary pixels.
 * @typedef {'top10k' | 'other'} SiteRankBucket
 */

/**
 * @typedef {Object} TopSitesBloomData
 * @property {number} totalEntries
 * @property {number} errorRate
 * @property {string} data - base64 encoded filter bits
 */

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToUint8Array(base64) {
    const binaryString = globalThis.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Create a lookup that maps a URL to its site rank bucket. The lookup is done on the device only.
 * @param {TopSitesBloomData} bloomData
 * @returns {(url: string) => SiteRankBucket}
 */
export function createSiteRankLookup(bloomData) {
    const bloom = jsbloom.filter(bloomData.totalEntries, bloomData.errorRate);
    bloom.importData(base64ToUint8Array(bloomData.data));
    return (url) => {
        const domain = getDomain(url)?.toLowerCase();
        return domain && bloom.checkEntry(domain) ? 'top10k' : 'other';
    };
}

/**
 * Create the lookup from the bundled top sites filter.
 * @returns {(url: string) => SiteRankBucket}
 */
export function createBundledSiteRankLookup() {
    return createSiteRankLookup(topSitesBloomData);
}
