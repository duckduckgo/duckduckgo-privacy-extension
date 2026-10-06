import { parse } from 'tldts';
import { normalizeBlockedSite } from './blocked-sites';
import { hostnameMatchesDomain } from './site-groups';

const GLOB_PATTERN = /^[a-z0-9.*-]+$/;
const MAX_PATTERN_LENGTH = 253;
/** Public suffixes that are still useful as `*.suffix` allow rules. */
const ALLOWED_PUBLIC_SUFFIX_GLOBS = new Set(['edu']);

/**
 * @typedef {'invalid' | 'tooBroad'} AllowedPatternRejectReason
 */

/**
 * @typedef {object} NormalizedAllowedPattern
 * @property {string | null} pattern
 * @property {AllowedPatternRejectReason | null} reason
 */

/**
 * @param {string} hostname
 * @returns {boolean}
 */
export function isPublicSuffixHostname(hostname) {
    if (!hostname || hostname === 'localhost') {
        return false;
    }
    const parsed = parse(hostname, { allowPrivateDomains: true });
    if (parsed.isIp) {
        return false;
    }
    return !parsed.domain || parsed.hostname === parsed.publicSuffix;
}

/**
 * @param {string} pattern
 * @returns {boolean}
 */
export function isGlobPattern(pattern) {
    return typeof pattern === 'string' && pattern.includes('*');
}

/**
 * Strip a scheme, path, query, and port so `https://*.youtube.com/watch` can be
 * treated as a glob.
 *
 * @param {string} value
 * @returns {string}
 */
function preprocessAllowedInput(value) {
    let input = value.trim();
    input = input.replace(/^[a-z][a-z\d+.-]*:\/\//i, '');
    input = input.split(/[/?#]/, 1)[0];
    input = input.replace(/:\d+$/, '');
    return input.toLowerCase();
}

/**
 * @param {string} pattern
 * @returns {boolean}
 */
function hasAlphanumericLiteral(pattern) {
    return /[a-z0-9]/i.test(pattern.replace(/\*/g, ''));
}

/**
 * `*.com`, `*.co.uk`, and a lone `*` are too broad. `*.edu`, `*foo`, and
 * `*.youtube.com` are not.
 *
 * @param {string} pattern
 * @returns {boolean}
 */
export function isTooBroadAllowedPattern(pattern) {
    if (!hasAlphanumericLiteral(pattern)) {
        return true;
    }
    if (!isGlobPattern(pattern)) {
        return isPublicSuffixHostname(pattern);
    }

    const lastStar = pattern.lastIndexOf('*');
    const after = pattern.slice(lastStar + 1);
    if (after.startsWith('.')) {
        const suffix = after.replace(/^\.+/, '');
        if (suffix && isPublicSuffixHostname(suffix) && !ALLOWED_PUBLIC_SUFFIX_GLOBS.has(suffix)) {
            return true;
        }
    }
    return false;
}

/**
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
    let source = '';
    for (const char of glob) {
        if (char === '*') {
            source += '.*';
        } else if ('.*+?^${}()|[]\\'.includes(char)) {
            source += `\\${char}`;
        } else {
            source += char;
        }
    }
    return new RegExp(`^${source}$`);
}

/**
 * Concrete hostname implied by a glob suffix, e.g. `*.music.youtube.com` →
 * `music.youtube.com`, `*cdn.youtube.com` → `cdn.youtube.com`.
 *
 * @param {string} pattern
 * @returns {string | null}
 */
export function concreteSuffix(pattern) {
    if (!isGlobPattern(pattern)) {
        return pattern;
    }
    const lastStar = pattern.lastIndexOf('*');
    const suffix = pattern.slice(lastStar + 1).replace(/^\.+/, '');
    return suffix || null;
}

/**
 * @param {unknown} value
 * @returns {NormalizedAllowedPattern}
 */
export function normalizeAllowedPattern(value) {
    if (typeof value !== 'string') {
        return { pattern: null, reason: 'invalid' };
    }

    const raw = value.trim();
    if (!raw) {
        return { pattern: null, reason: 'invalid' };
    }
    const schemeMatch = raw.match(/^([a-z][a-z\d+.-]*):\/\//i);
    if (schemeMatch && !['http', 'https'].includes(schemeMatch[1].toLowerCase())) {
        return { pattern: null, reason: 'invalid' };
    }

    const input = preprocessAllowedInput(raw);
    if (!input || input.length > MAX_PATTERN_LENGTH) {
        return { pattern: null, reason: 'invalid' };
    }

    if (isGlobPattern(input)) {
        if (
            !GLOB_PATTERN.test(input) ||
            input.includes('..') ||
            input.startsWith('.') ||
            input.startsWith('-') ||
            input.endsWith('.') ||
            input.endsWith('-')
        ) {
            return { pattern: null, reason: 'invalid' };
        }
        if (isTooBroadAllowedPattern(input)) {
            return { pattern: null, reason: 'tooBroad' };
        }
        return { pattern: input, reason: null };
    }

    const hostname = normalizeBlockedSite(input);
    if (!hostname) {
        return { pattern: null, reason: 'invalid' };
    }
    if (isTooBroadAllowedPattern(hostname)) {
        return { pattern: null, reason: 'tooBroad' };
    }
    return { pattern: hostname, reason: null };
}

/**
 * @param {string} pattern
 * @param {string} hostname
 * @returns {boolean}
 */
export function allowedPatternMatchesHostname(pattern, hostname) {
    if (!pattern || !hostname) {
        return false;
    }
    const host = hostname.toLowerCase().replace(/\.$/, '');
    if (!isGlobPattern(pattern)) {
        return hostnameMatchesDomain(host, pattern);
    }
    if (globToRegExp(pattern).test(host)) {
        return true;
    }
    return pattern.startsWith('*.') && host === pattern.slice(2);
}

/**
 * Subdomain matching both ways, plus globs that would cover a grouped host.
 *
 * @param {string} pattern
 * @param {string} groupDomain
 * @returns {boolean}
 */
export function overlapsGroupDomain(pattern, groupDomain) {
    if (!pattern || !groupDomain) {
        return false;
    }
    if (allowedPatternMatchesHostname(pattern, groupDomain) || allowedPatternMatchesHostname(pattern, `www.${groupDomain}`)) {
        return true;
    }
    const suffix = concreteSuffix(pattern);
    if (!suffix) {
        return false;
    }
    return hostnameMatchesDomain(suffix, groupDomain) || hostnameMatchesDomain(groupDomain, suffix);
}

/**
 * @param {string[]} patterns
 * @param {string} groupDomain
 * @returns {string[]}
 */
export function findOverlappingAllowedPatterns(patterns, groupDomain) {
    if (!Array.isArray(patterns) || !groupDomain) {
        return [];
    }
    return patterns.filter((pattern) => overlapsGroupDomain(pattern, groupDomain));
}

/**
 * @param {string | null | undefined} hostname
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function isHostnameAllowed(hostname, patterns) {
    if (!hostname || !Array.isArray(patterns) || patterns.length === 0) {
        return false;
    }
    return patterns.some((pattern) => allowedPatternMatchesHostname(pattern, hostname));
}

/**
 * Most specific allowed pattern for a hostname. A concrete host outranks a glob.
 *
 * @param {string | null | undefined} hostname
 * @param {string[]} patterns
 * @returns {string | null}
 */
export function matchingAllowedPattern(hostname, patterns) {
    if (!hostname || !Array.isArray(patterns) || patterns.length === 0) {
        return null;
    }

    let bestPattern = null;
    let bestScore = -1;
    for (const pattern of patterns) {
        if (!allowedPatternMatchesHostname(pattern, hostname)) {
            continue;
        }
        const score = pattern.length + (isGlobPattern(pattern) ? 0 : 1000);
        if (score > bestScore) {
            bestPattern = pattern;
            bestScore = score;
        }
    }
    return bestPattern;
}

/**
 * `example.com` and `*.example.com` can use DNR requestDomains. Other globs need a regex.
 *
 * @param {string} pattern
 * @returns {string | null}
 */
export function requestDomainForAllowedPattern(pattern) {
    if (!pattern) {
        return null;
    }
    if (!isGlobPattern(pattern)) {
        return pattern;
    }
    if (pattern.startsWith('*.') && !pattern.slice(2).includes('*')) {
        const domain = pattern.slice(2);
        if (isPublicSuffixHostname(domain)) {
            return null;
        }
        return domain;
    }
    return null;
}

/**
 * RE2 hostname glob for a DNR regexFilter, anchored to an http(s) URL.
 *
 * @param {string} pattern
 * @returns {string | null}
 */
export function dnrRegexForAllowedPattern(pattern) {
    if (!pattern || requestDomainForAllowedPattern(pattern)) {
        return null;
    }
    let host = '';
    for (const char of pattern) {
        if (char === '*') {
            host += '[^/?#]*';
        } else if ('.*+?^${}()|[]\\'.includes(char)) {
            host += `\\${char}`;
        } else {
            host += char;
        }
    }
    return `^https?://([^/?#:@]*@)?${host}(:[0-9]+)?([/?#]|$)`;
}

/**
 * @param {string} pattern
 * @param {import('./site-groups').SiteGroup[]} groups
 * @returns {{ groupId: string, groupName: string, domain: string } | null}
 */
export function findAllowedConflict(pattern, groups) {
    if (!pattern || !Array.isArray(groups)) {
        return null;
    }
    for (const group of groups) {
        for (const domain of group.domains) {
            if (overlapsGroupDomain(pattern, domain)) {
                return { groupId: group.id, groupName: group.name, domain };
            }
        }
    }
    return null;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeAllowedSites(value) {
    const patterns = new Set();
    if (!Array.isArray(value)) {
        return [];
    }
    for (const entry of value) {
        const { pattern } = normalizeAllowedPattern(entry);
        if (pattern) {
            patterns.add(pattern);
        }
    }
    return Array.from(patterns).sort();
}

/**
 * @typedef {object} AllowedSitesParseError
 * @property {string} line
 * @property {AllowedPatternRejectReason} reason
 */

/**
 * @param {unknown} value
 * @returns {{ patterns: string[], rejected: AllowedSitesParseError[] }}
 */
export function parseAllowedSitesInput(value) {
    if (typeof value !== 'string') {
        return { patterns: [], rejected: [] };
    }

    const patterns = [];
    const seen = new Set();
    /** @type {AllowedSitesParseError[]} */
    const rejected = [];

    for (const rawLine of value.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) {
            continue;
        }
        const { pattern, reason } = normalizeAllowedPattern(line);
        if (!pattern) {
            rejected.push({ line, reason: reason || 'invalid' });
            continue;
        }
        if (seen.has(pattern)) {
            continue;
        }
        seen.add(pattern);
        patterns.push(pattern);
    }

    return { patterns, rejected };
}
