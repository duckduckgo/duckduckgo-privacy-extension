import fs from 'fs';
import zlib from 'zlib';
import { getDomain } from 'tldts';

function readText(file) {
    let raw = fs.readFileSync(file);
    if (file.endsWith('.gz')) {
        raw = zlib.gunzipSync(raw);
    }
    return raw.toString('utf-8');
}

/** ICANN-only registrable domain (tldts ignores the PSL PRIVATE section by default). */
export function registrableDomain(entry) {
    return getDomain(entry)?.toLowerCase() ?? null;
}

/**
 * CrUX top list (`origin,rank`, rank is a magnitude bucket). Stable sort by rank, take `limit` rows, normalize.
 * Same selection as scripts/build-cpm-top-sites-bloom.mjs.
 */
export function loadCruxMembers(file, limit) {
    const rows = readText(file)
        .split(/\r?\n/)
        .slice(1)
        .filter(Boolean)
        .map((line) => {
            const [origin, rank] = line.split(',');
            return { origin, rank: Number(rank) };
        });
    rows.sort((a, b) => a.rank - b.rank);
    const domains = new Set();
    for (const { origin } of rows.slice(0, limit)) {
        const domain = registrableDomain(origin);
        if (domain) {
            domains.add(domain);
        }
    }
    return [...domains].sort();
}

/** Tranco `rank,domain` list, in rank order. */
export function loadTranco(file) {
    return readText(file)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => line.slice(line.indexOf(',') + 1).toLowerCase());
}

/** SERP clicks `rank,domain,clicks` with a header row, in rank order. */
export function loadSerp(file) {
    const lines = readText(file).split(/\r?\n/).slice(1).filter(Boolean);
    return lines.map((line) => {
        const [rank, domain, clicks] = line.split(',');
        return { rank: Number(rank), domain, clicks: Number(clicks) };
    });
}

export function readMembers(file) {
    return readText(file).split('\n').filter(Boolean);
}
