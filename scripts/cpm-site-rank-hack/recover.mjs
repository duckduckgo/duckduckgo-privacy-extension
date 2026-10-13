/**
 * How much of the member list someone could recover from each bundled data file, by testing public candidate domains.
 *   node recover.mjs --data <dir from build-data.mjs> --tranco tranco.csv --crux <YYYYMM.csv.gz> -o recover.json
 * Candidates: Tranco top 1M plus every CrUX origin, as registrable domains.
 */
import fs from 'fs';
import path from 'path';
import { parseArgs } from 'node:util';
import { OPTIONS } from './options.mjs';
import { loadCruxMembers, loadTranco, readMembers, registrableDomain } from './lists.mjs';

const { values: argv } = parseArgs({
    options: { data: { type: 'string' }, tranco: { type: 'string' }, crux: { type: 'string' }, output: { type: 'string', short: 'o' } },
});
const members = new Set(readMembers(path.join(argv.data, 'members.txt')));
const candidates = new Set([...loadTranco(argv.tranco).map(registrableDomain), ...loadCruxMembers(argv.crux, Infinity)].filter(Boolean));
const results = { members: members.size, candidates: candidates.size, options: [] };
for (const option of OPTIONS) {
    const mod = await import(`./lookups/${option.module}.js`);
    const match = mod.createHostMatcher(JSON.parse(fs.readFileSync(path.join(argv.data, option.file), 'utf-8')));
    await match.ready;
    let recovered = 0;
    let wrong = 0;
    for (const d of candidates) {
        if (match(d)) {
            members.has(d) ? recovered++ : wrong++;
        }
    }
    results.options.push({ id: option.id, recovered, wrong, precision: recovered / (recovered + wrong) });
}
fs.writeFileSync(argv.output, JSON.stringify(results, null, 2));
console.log(`candidates ${results.candidates}`);
for (const o of results.options) {
    console.log(
        `${o.id.padEnd(6)} recovered ${o.recovered}/${results.members}  wrong ${o.wrong}  precision ${(o.precision * 100).toFixed(1)}%`,
    );
}
