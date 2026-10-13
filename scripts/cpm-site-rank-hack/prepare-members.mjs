/**
 * Writes a sorted member list, one registrable domain per line.
 *   node prepare-members.mjs --crux <YYYYMM.csv.gz> -o members.txt [--limit 10000]
 *   node prepare-members.mjs --serp <serp-clicks.csv> -o members.txt [--limit 10000]
 */
import fs from 'fs';
import { parseArgs } from 'node:util';
import { loadCruxMembers, loadSerp, registrableDomain } from './lists.mjs';

const { values: argv } = parseArgs({
    options: {
        crux: { type: 'string' },
        serp: { type: 'string' },
        output: { type: 'string', short: 'o' },
        limit: { type: 'string', default: '10000' },
    },
});
const limit = Number(argv.limit);

let members;
if (argv.crux) {
    members = loadCruxMembers(argv.crux, limit);
} else if (argv.serp) {
    const rows = loadSerp(argv.serp).slice(0, limit);
    const changed = rows.filter((r) => registrableDomain(r.domain) !== r.domain);
    console.error(`SERP rows whose tldts registrable domain differs from the file: ${changed.length}`);
    for (const r of changed.slice(0, 20)) {
        console.error(`  ${r.domain} -> ${registrableDomain(r.domain)}`);
    }
    members = [...new Set(rows.map((r) => r.domain))].sort();
} else {
    throw new Error('--crux or --serp is required');
}
fs.writeFileSync(argv.output, members.join('\n') + '\n');
console.error(`Wrote ${members.length} members to ${argv.output}`);
