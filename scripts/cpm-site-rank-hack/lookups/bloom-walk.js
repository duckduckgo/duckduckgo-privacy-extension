import jsbloom from '@duckduckgo/jsbloom';
import { base64ToBytes, hostnameFromUrl, someSuffix } from './suffix-walk.js';

/** Option 4: the same jsbloom filter, looked up by walking the hostname's suffixes instead of tldts. */
export function createHostMatcher(data) {
    const bloom = jsbloom.filter(data.totalEntries, data.errorRate);
    bloom.importData(base64ToBytes(data.data));
    return (hostname) => someSuffix(hostname, bloom.checkEntry);
}

export function createSiteRankLookup(data) {
    const matches = createHostMatcher(data);
    return (url) => {
        const hostname = hostnameFromUrl(url);
        return hostname && matches(hostname) ? 'top10k' : 'other';
    };
}
