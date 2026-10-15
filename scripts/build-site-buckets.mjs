/**
 * Builds shared/data/bundled/site-buckets.json, the top sites list behind the CPM `siteRank` pixel parameter.
 *
 * Usage: node scripts/build-site-buckets.mjs -i <CrUX top list .csv or .csv.gz> [-o <output file>]
 */
import { parseArgs } from 'node:util';
import fs from 'fs';
import zlib from 'zlib';
import { getDomain } from 'tldts';
import { encodeDomainHashes } from '../shared/js/shared-utils/domain-hashes.js';

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
 * @param {string} line - `origin,rank`
 * @returns {{ origin: string, rank: number } | null}
 */
function parseLine(line) {
    const [origin, rank] = line.split(',');
    return /^\d+$/.test(rank) ? { origin, rank: Number(rank) } : null;
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
    fail(`Read ${rows.length} rows, need at least ${LIMIT}. Is the input a CrUX top list?`);
}
// CrUX ranks are buckets (1000, 5000, 10000, ...) with no order inside, so a cut inside a bucket would pick arbitrary sites
if (rows.length > LIMIT && rows[LIMIT].rank === rows[LIMIT - 1].rank) {
    fail(`The top ${LIMIT} rows end inside a rank bucket (rank ${rows[LIMIT].rank}).`);
}

const domains = new Set();
for (const { origin } of rows.slice(0, LIMIT)) {
    // Normalized like the lookup, which hashes `new URL(url).hostname`; each github.io site is its own entry
    const domain = URL.canParse(origin) && getDomain(new URL(origin).hostname, { allowPrivateDomains: true });
    if (domain) {
        domains.add(domain);
    }
}

if (domains.size < LIMIT / 2) {
    fail(`Only ${domains.size} registrable domains in the top ${LIMIT} rows. Is the input a CrUX top list?`);
}

const topSites = encodeDomainHashes([...domains]);
fs.writeFileSync(argv.output, JSON.stringify(topSites, null, 4) + '\n');

console.log(`Read ${rows.length} rows, took ${LIMIT}, wrote ${domains.size} unique domains to ${argv.output}`);
console.log(`Hash collisions: ${domains.size - topSites.count}, data size: ${topSites.data.length} bytes`);
