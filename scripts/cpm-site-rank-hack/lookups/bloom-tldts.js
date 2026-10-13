import { getDomain } from 'tldts';
import jsbloom from '@duckduckgo/jsbloom';
import { base64ToBytes } from './suffix-walk.js';

/** Option 1: the prototype. jsbloom filter of registrable domains, looked up with tldts.getDomain(). */
export function createHostMatcher(data) {
    const bloom = jsbloom.filter(data.totalEntries, data.errorRate);
    bloom.importData(base64ToBytes(data.data));
    return (hostname) => {
        const domain = getDomain(hostname);
        return !!domain && bloom.checkEntry(domain);
    };
}

export function createSiteRankLookup(data) {
    const bloom = jsbloom.filter(data.totalEntries, data.errorRate);
    bloom.importData(base64ToBytes(data.data));
    return (url) => {
        const domain = getDomain(url)?.toLowerCase();
        return domain && bloom.checkEntry(domain) ? 'top10k' : 'other';
    };
}
