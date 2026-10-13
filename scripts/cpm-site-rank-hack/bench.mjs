/**
 * Lookup speed of one option, in a fresh process so options don't share JIT state.
 *   node bench.mjs --data <dir> --tranco tranco.csv --option <id> [--samples 200000]
 * Prints one JSON line: load time of the data, and median and p99 time per URL lookup.
 * Each URL is https://www.<domain>/path?q=1; 1 in 10 is a member.
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'node:util';
import { getDomain } from 'tldts';
import { loadTranco, readMembers } from './lists.mjs';
import { OPTIONS } from './options.mjs';

const { values: argv } = parseArgs({
    options: {
        data: { type: 'string' },
        tranco: { type: 'string' },
        option: { type: 'string' },
        samples: { type: 'string', default: '200000' },
    },
});
const option = OPTIONS.find((o) => o.id === argv.option);
const members = readMembers(path.join(argv.data, 'members.txt'));
const memberSet = new Set(members);
const nonMembers = loadTranco(argv.tranco).filter((d) => !memberSet.has(getDomain(d)));

let seed = 42;
function random() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const urls = [];
for (let i = 0; i < Number(argv.samples); i++) {
    const pool = i % 10 === 0 ? members : nonMembers;
    urls.push(`https://www.${pool[Math.floor(random() * pool.length)]}/path?q=1`);
}

const mod = await import(`./lookups/${option.module}.js`);
const text = fs.readFileSync(path.join(argv.data, option.file), 'utf-8');
const loadStart = process.hrtime.bigint();
const lookup = mod.createSiteRankLookup(JSON.parse(text));
await lookup.ready;
const loadMs = Number(process.hrtime.bigint() - loadStart) / 1e6;

let sink = 0;
for (let pass = 0; pass < 2; pass++) {
    for (const url of urls) {
        sink += lookup(url) === 'top10k' ? 1 : 0;
    }
}
// Single lookups are timed individually; the timer resolution on Apple silicon is about 42 ns.
const times = new Float64Array(urls.length);
for (let i = 0; i < urls.length; i++) {
    const t0 = process.hrtime.bigint();
    sink += lookup(urls[i]) === 'top10k' ? 1 : 0;
    times[i] = Number(process.hrtime.bigint() - t0);
}
times.sort();
const batchStart = process.hrtime.bigint();
for (const url of urls) {
    sink += lookup(url) === 'top10k' ? 1 : 0;
}
const meanNs = Number(process.hrtime.bigint() - batchStart) / urls.length;
const pick = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
console.log(JSON.stringify({ id: option.id, loadMs, medianNs: pick(0.5), p99Ns: pick(0.99), meanNs, sink }));
