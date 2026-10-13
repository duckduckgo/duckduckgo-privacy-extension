/**
 * Builds the data file for every option from a member list.
 *   node build-data.mjs --members members.txt --out <dir> [--bloom-rates 0.00002,0.0002,0.002]
 */
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { parseArgs } from 'node:util';
import jsbloom from '@duckduckgo/jsbloom';
import { fnv1a32 } from './lookups/suffix-walk.js';
import { readMembers } from './lists.mjs';

const { values: argv } = parseArgs({
    options: {
        members: { type: 'string' },
        out: { type: 'string' },
        'bloom-rates': { type: 'string', default: '0.00002,0.0002,0.002' },
    },
});
const members = readMembers(argv.members);
fs.mkdirSync(argv.out, { recursive: true });

function write(name, data) {
    const file = path.join(argv.out, name);
    fs.writeFileSync(file, JSON.stringify(data));
    console.log(`${name.padEnd(28)} ${fs.statSync(file).size} bytes`);
}

for (const rate of argv['bloom-rates'].split(',').map(Number)) {
    const bloom = jsbloom.filter(members.length, rate);
    members.forEach((d) => bloom.addEntry(d));
    write(`bloom-${rate}.json`, {
        totalEntries: members.length,
        errorRate: rate,
        data: Buffer.from(bloom.exportData()).toString('base64'),
    });
}

// Same insert as bundleTrackers.mjs, except that a shorter member already in the trie covers longer ones.
const trie = {};
for (const domain of members) {
    const labels = domain.split('.').reverse();
    let node = trie;
    for (let i = 0; i < labels.length - 1 && node !== 1; i++) {
        node[labels[i]] ??= {};
        node = node[labels[i]];
    }
    if (node !== 1) {
        node[labels[labels.length - 1]] = 1;
    }
}
write('trie.json', { trie: JSON.stringify(trie) });
write('trie-object.json', { trie });

const groups = new Map();
for (const domain of members) {
    const dot = domain.lastIndexOf('.');
    const tld = domain.slice(dot + 1);
    if (!groups.has(tld)) {
        groups.set(tld, []);
    }
    groups.get(tld).push(domain.slice(0, dot));
}
const grouped = [...groups].map(([tld, names]) => `${tld}:${names.join(' ')}`).join('|');
write('domain-set.json', { domains: grouped });
write('domain-set-deflate.json', { data: zlib.deflateRawSync(grouped, { level: 9 }).toString('base64') });

const hashes = [...new Set(members.map(fnv1a32))].sort((a, b) => a - b);
console.log(`hash collisions among members: ${members.length - hashes.length}`);
const raw = Buffer.alloc(hashes.length * 4);
hashes.forEach((h, i) => raw.writeUInt32LE(h, i * 4));
write('hash-raw.json', { encoding: 'raw', count: hashes.length, data: raw.toString('base64') });
const varints = [];
let prev = 0;
for (const h of hashes) {
    let gap = h - prev;
    prev = h;
    while (gap >= 0x80) {
        varints.push((gap % 0x80) | 0x80);
        gap = Math.floor(gap / 0x80);
    }
    varints.push(gap);
}
write('hash-delta.json', { encoding: 'delta', count: hashes.length, data: Buffer.from(varints).toString('base64') });
