/** Every option measured, with the lookup module in ./lookups and the data file from build-data.mjs. */
export const OPTIONS = [
    { id: '1a', name: 'Bloom + tldts, nominal 0.000005', module: 'bloom-tldts', file: 'bloom-0.000005.json' },
    { id: '1b', name: 'Bloom + tldts, nominal 0.0002 (prototype)', module: 'bloom-tldts', file: 'bloom-0.0002.json' },
    { id: '1c', name: 'Bloom + tldts, nominal 0.006', module: 'bloom-tldts', file: 'bloom-0.006.json' },
    { id: '2', name: 'Trie, JSON text parsed at load', module: 'trie', file: 'trie.json' },
    { id: '2-obj', name: 'Trie, imported as JSON object', module: 'trie', file: 'trie-object.json' },
    { id: '2b', name: 'Domain list grouped by TLD, Set', module: 'domain-set', file: 'domain-set.json' },
    { id: '2c', name: 'Domain list grouped by TLD, deflate-raw, Set', module: 'domain-set-deflate', file: 'domain-set-deflate.json' },
    { id: '3', name: '32-bit hashes, raw uint32', module: 'hash-array', file: 'hash-raw.json' },
    { id: '3b', name: '32-bit hashes, delta varints', module: 'hash-array', file: 'hash-delta.json' },
    { id: '4a', name: 'Bloom + suffix walk, nominal 0.000005', module: 'bloom-walk', file: 'bloom-0.000005.json' },
    { id: '4b', name: 'Bloom + suffix walk, nominal 0.0002', module: 'bloom-walk', file: 'bloom-0.0002.json' },
    { id: '4c', name: 'Bloom + suffix walk, nominal 0.006', module: 'bloom-walk', file: 'bloom-0.006.json' },
];
