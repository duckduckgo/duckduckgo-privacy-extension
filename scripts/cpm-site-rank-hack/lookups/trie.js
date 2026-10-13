import { hostnameFromUrl } from './suffix-walk.js';

/**
 * Option 2: trie of reversed domain labels, as in content-scope-scripts bundleTrackers.mjs.
 * trie.com.example === 1 when example.com is a member. `data.trie` is JSON text, parsed once at load.
 */
export function createHostMatcher(data) {
    const trie = typeof data.trie === 'string' ? JSON.parse(data.trie) : data.trie;
    return (hostname) => {
        let node = trie;
        let end = hostname.length;
        while (end > 0) {
            const start = hostname.lastIndexOf('.', end - 1);
            node = node[hostname.slice(start + 1, end)];
            if (node === 1) {
                return true;
            }
            if (typeof node !== 'object' || start < 0) {
                return false;
            }
            end = start;
        }
        return false;
    };
}

export function createSiteRankLookup(data) {
    const matches = createHostMatcher(data);
    return (url) => {
        const hostname = hostnameFromUrl(url);
        return hostname && matches(hostname) ? 'top10k' : 'other';
    };
}
