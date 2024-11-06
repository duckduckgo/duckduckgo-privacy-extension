/**
 * Utility for tests that converts a pixel request URL into a nicely formatted
 * Object. Returns null for invalid URLs and non-pixel URLs.
 * @param {string|URL} url
 * @return {{
 *   name: string,
 *   params: Object
 * }?}
 */
export function _formatPixelRequestForTesting(url) {
    let parsed;
    try {
        parsed = url instanceof URL ? url : new URL(url);
    } catch (e) {
        return null;
    }

    if (parsed.hostname !== 'improving.duckduckgo.com') {
        return null;
    }

    const name = parsed.pathname.split('/').pop();

    if (!name) {
        return null;
    }

    const params = {};
    for (const [key, value] of parsed.searchParams) {
        // Ignore the random number prefix, that's sent to avoid caching.
        if (value === '' && /^[0-9]+$/.test(key)) {
            continue;
        }

        // Ignore the test=1 parameter that's sent so that testing pixel
        // requests are ignored on the server-side.
        if (value === '1' && key === 'test') {
            continue;
        }

        params[key] = value;
    }

    return { name, params };
}
