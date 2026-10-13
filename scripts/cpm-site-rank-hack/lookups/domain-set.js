import { hostnameFromUrl, someSuffix } from './suffix-walk.js';

/**
 * Option 2b: plain domain list grouped by top-level domain, loaded into a Set.
 * `data.domains` looks like "com:example google|uk:bbc.co" for example.com, google.com and bbc.co.uk.
 */
export function createHostMatcher(data) {
    const domains = new Set();
    for (const group of data.domains.split('|')) {
        const [tld, names] = group.split(':');
        for (const name of names.split(' ')) {
            domains.add(`${name}.${tld}`);
        }
    }
    return (hostname) => someSuffix(hostname, (suffix) => domains.has(suffix));
}

export function createSiteRankLookup(data) {
    const matches = createHostMatcher(data);
    return (url) => {
        const hostname = hostnameFromUrl(url);
        return hostname && matches(hostname) ? 'top10k' : 'other';
    };
}
