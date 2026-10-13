/**
 * Prints the real false match rate of jsbloom + tldts on Tranco non-members for a range of nominal error rates.
 *   node calibrate-bloom.mjs --members members.txt --tranco tranco.csv
 */
import { parseArgs } from 'node:util';
import jsbloom from '@duckduckgo/jsbloom';
import { loadTranco, readMembers, registrableDomain } from './lists.mjs';

const { values: argv } = parseArgs({ options: { members: { type: 'string' }, tranco: { type: 'string' } } });
const members = readMembers(argv.members);
const memberSet = new Set(members);
const nonMembers = [
    ...new Set(
        loadTranco(argv.tranco)
            .map(registrableDomain)
            .filter((d) => d && !memberSet.has(d)),
    ),
];
console.log(`non-members: ${nonMembers.length}`);
for (const rate of [0.000005, 0.00001, 0.00002, 0.00003, 0.00005, 0.0001, 0.0002, 0.0003, 0.0005, 0.001, 0.002, 0.003, 0.005]) {
    const bloom = jsbloom.filter(members.length, rate);
    members.forEach((d) => bloom.addEntry(d));
    const fp = nonMembers.filter((d) => bloom.checkEntry(d)).length;
    console.log(`nominal ${rate}\tbytes ${bloom.exportData().length}\treal ${((fp / nonMembers.length) * 100).toFixed(4)}%\t(${fp})`);
}
