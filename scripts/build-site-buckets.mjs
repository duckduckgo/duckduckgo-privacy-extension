/**
 * Builds the top sites data for the CPM site rank bucket.
 *
 * Usage:
 *   node scripts/build-site-buckets.mjs -i <list file> [-o <output file>]
 *
 * The input file can be plain text or gzipped (.gz). Accepted formats, one entry per line:
 *  - `rank,domain[,...]` CSV (e.g. Tranco)
 *  - `origin,rank` CSV (e.g. CrUX top lists, where rank is a magnitude bucket)
 *  - one domain (or URL) per line, in rank order
 * A header line without a numeric rank is skipped.
 * Entries are sorted by rank (stable, so file order breaks ties), the first 10,000 rows are taken,
 * and each one is normalized to its lowercase registrable domain, with IDNs in punycode.
 * Private suffixes such as github.io count as public suffixes, so their users' sites stay separate entries.
 */
import { parseArgs } from 'node:util';
import fs from 'fs';
import zlib from 'zlib';
import { getDomain } from 'tldts';
import { encodeTopSites } from '../shared/js/background/components/cpm-site-rank.js';

const DEFAULT_OUTPUT = 'shared/data/bundled/site-buckets.json';
// The `top10k` bucket name depends on this; change both together.
const LIMIT = 10000;

const { values: argv } = parseArgs({
    options: {
        input: { type: 'string', short: 'i' },
        output: { type: 'string', short: 'o', default: DEFAULT_OUTPUT },
    },
});

/**
 * @param {string} message
 */
function fail(message) {
    console.error(message);
    process.exit(1);
}

if (!argv.input || !fs.existsSync(argv.input)) {
    fail('Input list file (-i) must exist.');
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

if (rows.length < LIMIT) {
    fail(`Read ${rows.length} rows, need at least ${LIMIT}. Is the input a ranked list?`);
}
// CrUX ranks are magnitude buckets in random order, so a cut inside a bucket would pick arbitrary sites
if (rows.length > LIMIT && rows[LIMIT].rank === rows[LIMIT - 1].rank) {
    fail(`The top ${LIMIT} rows end inside a rank bucket (rank ${rows[LIMIT].rank}).`);
}

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
for (const { entry } of rows.slice(0, LIMIT)) {
    const hostname = toHostname(entry);
    const domain = hostname && getDomain(hostname, { allowPrivateDomains: true });
    if (domain) {
        domains.add(domain);
    }
}

if (domains.size < LIMIT / 2) {
    fail(`Only ${domains.size} registrable domains in the top ${LIMIT} rows. Is the input a ranked list?`);
}

const topSites = encodeTopSites([...domains]);
fs.writeFileSync(argv.output, JSON.stringify(topSites, null, 4) + '\n');

console.log(`Read ${rows.length} rows, took ${LIMIT}, wrote ${domains.size} unique domains to ${argv.output}`);
console.log(`Hash collisions: ${domains.size - topSites.count}, data size: ${topSites.data.length} bytes`);
