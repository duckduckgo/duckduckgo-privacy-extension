/**
 * Builds the top sites data used for the coarse site rank bucket in CPM summary pixels.
 * The output is gitignored and built locally. Release builds in CI don't have it yet and ship an empty list, so the
 * summary pixel never carries siteRank. See docs/cpm-site-rank.md before releasing.
 *
 * Usage:
 *   node scripts/build-cpm-top-sites.mjs -i <list file> [--limit 10000]
 *   node scripts/build-cpm-top-sites.mjs --empty
 *
 * The input file can be plain text or gzipped (.gz). Accepted formats, one entry per line:
 *  - `rank,domain[,...]` CSV (e.g. Tranco)
 *  - `origin,rank` CSV (e.g. CrUX top lists, where rank is a magnitude bucket)
 *  - one domain (or URL) per line, in rank order
 * A header line without a numeric rank is skipped.
 * Entries are sorted by rank (stable, so file order breaks ties), the first `limit` rows are taken,
 * and each one is normalized to its lowercase registrable domain (ICANN suffixes only), with IDNs in punycode.
 *
 * --empty writes a list with no sites, so builds work without the data. The extension then sends summary pixels
 * without a site rank.
 *
 * The output holds only the hashes: it is bundled into the extension, so it must not name the list's source.
 */
import { parseArgs } from 'node:util';
import fs from 'fs';
import zlib from 'zlib';
import { getDomain } from 'tldts';
import { encodeTopSites } from '../shared/js/background/components/cpm-site-rank.js';

const DEFAULT_OUTPUT = 'shared/data/bundled/cpm-top-sites.json';

const { values: argv } = parseArgs({
    options: {
        input: { type: 'string', short: 'i' },
        output: { type: 'string', short: 'o', default: DEFAULT_OUTPUT },
        limit: { type: 'string', default: '10000' },
        empty: { type: 'boolean', default: false },
    },
});

if (argv.empty) {
    fs.writeFileSync(argv.output, JSON.stringify(encodeTopSites([]), null, 4) + '\n');
    console.log(`Wrote an empty top sites list to ${argv.output}`);
    process.exit(0);
}

if (!argv.input || !fs.existsSync(argv.input)) {
    console.error('Input list file (-i) must exist.');
    process.exit(1);
}
const limit = Number(argv.limit);
if (!Number.isInteger(limit) || limit <= 0) {
    console.error('--limit must be a positive integer.');
    process.exit(1);
}

/**
 * @param {string} line
 * @param {number} index
 * @returns {{ rank: number, entry: string } | null}
 */
function parseLine(line, index) {
    const fields = line
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
    if (fields.length === 0) {
        return null;
    }
    if (fields.length === 1) {
        return { rank: index, entry: fields[0] };
    }
    const rankIndex = fields.findIndex((f) => /^\d+$/.test(f));
    if (rankIndex === -1) {
        // header line
        return null;
    }
    const entry = fields.find((f, i) => i !== rankIndex && !/^\d+$/.test(f));
    return entry ? { rank: Number(fields[rankIndex]), entry } : null;
}

let raw = fs.readFileSync(argv.input);
if (argv.input.endsWith('.gz')) {
    raw = zlib.gunzipSync(raw);
}

const rows = raw
    .toString('utf-8')
    .split(/\r?\n/)
    .map(parseLine)
    .filter((row) => row !== null);
rows.sort((a, b) => a.rank - b.rank);

/**
 * Hostname as the extension sees it: lowercase, with IDNs in punycode, since the lookup hashes `new URL(url).hostname`.
 * @param {string} entry - domain or URL
 * @returns {string | null}
 */
function toHostname(entry) {
    try {
        return new URL(entry.includes('://') ? entry : `http://${entry}`).hostname;
    } catch {
        return null;
    }
}

const domains = new Set();
for (const { entry } of rows.slice(0, limit)) {
    const hostname = toHostname(entry);
    const domain = hostname && getDomain(hostname);
    if (domain) {
        domains.add(domain);
    }
}

const topSites = encodeTopSites([...domains]);
fs.writeFileSync(argv.output, JSON.stringify(topSites, null, 4) + '\n');

console.log(`Read ${rows.length} rows, took ${Math.min(limit, rows.length)}, wrote ${domains.size} unique domains to ${argv.output}`);
console.log(`Hash collisions: ${domains.size - topSites.count}, data size: ${topSites.data.length} bytes`);
