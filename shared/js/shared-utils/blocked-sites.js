/**
 * Normalize a user-provided domain or HTTP(S) URL to a hostname suitable for
 * use in a declarativeNetRequest requestDomains condition.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeBlockedSite(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const input = value.trim();
    if (!input || input.includes('*')) {
        return null;
    }

    try {
        const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(input) ? input : `https://${input}`);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
            return null;
        }

        const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
        if (!hostname || hostname.length > 253 || hostname.includes('*')) {
            return null;
        }
        const labels = hostname.split('.');
        if (
            !/^[a-z\d.-]+$/.test(hostname) ||
            labels.some((label) => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))
        ) {
            return null;
        }

        return hostname;
    } catch {
        return null;
    }
}

/**
 * Parse newline-separated blocked-site input.
 *
 * @param {unknown} value
 * @returns {{ domains: string[], invalidLines: string[] }}
 */
export function parseBlockedSitesInput(value) {
    if (typeof value !== 'string') {
        return { domains: [], invalidLines: [] };
    }

    const domains = new Set();
    const invalidLines = [];

    for (const rawLine of value.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }

        const domain = normalizeBlockedSite(line);
        if (domain) {
            domains.add(domain);
        } else {
            invalidLines.push(line);
        }
    }

    return {
        domains: Array.from(domains).sort(),
        invalidLines,
    };
}
