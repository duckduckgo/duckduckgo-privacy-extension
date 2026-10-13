import { base64ToBytes, hostnameFromUrl, someSuffix } from './suffix-walk.js';

/**
 * Option 2c: the option 2b list, deflate-raw compressed and base64 encoded, decompressed with DecompressionStream.
 * Decompression is asynchronous: the matcher answers false until the Set is ready.
 */
export function createHostMatcher(data) {
    const domains = new Set();
    const stream = new Blob([base64ToBytes(data.data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const ready = new Response(stream).text().then((text) => {
        for (const group of text.split('|')) {
            const [tld, names] = group.split(':');
            for (const name of names.split(' ')) {
                domains.add(`${name}.${tld}`);
            }
        }
    });
    const match = (hostname) => someSuffix(hostname, (suffix) => domains.has(suffix));
    match.ready = ready;
    return match;
}

export function createSiteRankLookup(data) {
    const matches = createHostMatcher(data);
    const lookup = (url) => {
        const hostname = hostnameFromUrl(url);
        return hostname && matches(hostname) ? 'top10k' : 'other';
    };
    lookup.ready = matches.ready;
    return lookup;
}
