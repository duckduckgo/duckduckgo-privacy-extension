/**
 * Builds the bundled Bloom filter of top sites, used for the coarse site rank bucket in CPM summary pixels.
 *
 * Usage:
 *   node scripts/build-cpm-top-sites-bloom.mjs -i <list file> --source <name> --list-id <id> [--date YYYY-MM-DD] [--limit 10000] [--error-rate 0.0002]
 *
 * The input file can be plain text or gzipped (.gz). Accepted formats, one entry per line:
 *  - `rank,domain` CSV (e.g. Tranco)
 *  - `origin,rank` CSV (e.g. CrUX top lists, where rank is a magnitude bucket)
 *  - one domain (or URL) per line, in rank order
 * A header line without a numeric rank is skipped.
 * Entries are sorted by rank (stable, so file order breaks ties), the first `limit` rows are taken,
 * and each one is normalized to its lowercase registrable domain.
 *
 * The jsbloom false match rate measured on random domains is about 3 times the configured error rate
 * (weak hash functions), so the default error rate of 0.0002 gives a measured rate of about 0.1%.
 */
import { parseArgs } from 'node:util';
import fs from 'fs';
import zlib from 'zlib';
import { getDomain } from 'tldts';
import jsbloom from '@duckduckgo/jsbloom';

const DEFAULT_OUTPUT = 'shared/data/bundled/cpm-top-sites-bloom.json';

const { values: argv } = parseArgs({
    options: {
        input: { type: 'string', short: 'i' },
        output: { type: 'string', short: 'o', default: DEFAULT_OUTPUT },
        limit: { type: 'string', default: '10000' },
        'error-rate': { type: 'string', default: '0.0002' },
        source: { type: 'string' },
        'list-id': { type: 'string' },
        date: { type: 'string', default: new Date().toISOString().slice(0, 10) },
    },
});

if (!argv.input || !fs.existsSync(argv.input)) {
    console.error('Input list file (-i) must exist.');
    process.exit(1);
}
if (!argv.source || !argv['list-id']) {
    console.error('--source and --list-id are required.');
    process.exit(1);
}
const limit = Number(argv.limit);
if (!Number.isInteger(limit) || limit <= 0) {
    console.error('--limit must be a positive integer.');
    process.exit(1);
}
const errorRate = Number(argv['error-rate']);
if (!(errorRate > 0 && errorRate < 1)) {
    console.error('--error-rate must be between 0 and 1.');
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
    const entry = fields.find((_, i) => i !== rankIndex);
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

const domains = new Set();
for (const { entry } of rows.slice(0, limit)) {
    const domain = getDomain(entry)?.toLowerCase();
    if (domain) {
        domains.add(domain);
    }
}

const bloom = jsbloom.filter(domains.size, errorRate);
for (const domain of domains) {
    bloom.addEntry(domain);
}

const output = {
    totalEntries: domains.size,
    errorRate,
    data: Buffer.from(bloom.exportData()).toString('base64'),
    source: argv.source,
    listId: argv['list-id'],
    date: argv.date,
};
fs.writeFileSync(argv.output, JSON.stringify(output, null, 4) + '\n');

console.log(`Read ${rows.length} rows, took ${Math.min(limit, rows.length)}, wrote ${domains.size} unique domains to ${argv.output}`);
console.log(`Filter size: ${bloom.exportData().length} bytes`);
