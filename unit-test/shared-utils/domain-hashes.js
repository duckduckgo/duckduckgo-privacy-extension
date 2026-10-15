import { containsHash, decodeDomainHashes, encodeDomainHashes, fnv1a32 } from '../../shared/js/shared-utils/domain-hashes';

describe('domain hashes', () => {
    // Ports, such as the native CPM site rank lookup in apple-browsers, must give the same hashes
    it('hashes with 32-bit FNV-1a', () => {
        expect(fnv1a32('')).toBe(0x811c9dc5);
        expect(fnv1a32('a')).toBe(0xe40c292c);
        expect(fnv1a32('foobar')).toBe(0xbf9cf968);
        expect(fnv1a32('example.com')).toBe(0x431ceb26);
        expect(fnv1a32('www.example.com')).toBe(0x88469fcb);
        expect(fnv1a32('bbc.co.uk')).toBe(0xe55ec88c);
        expect(fnv1a32('xn--bcher-kva.de')).toBe(0x0d16ee2d);
    });

    it('decodes to the sorted, unique hashes of the encoded domains', () => {
        const domains = ['google.com', 'youtube.com', 'wikipedia.org', 'google.com'];
        const encoded = encodeDomainHashes(domains);
        const expected = [...new Set(domains.map(fnv1a32))].sort((a, b) => a - b);
        expect(encoded.count).toBe(3);
        expect(Array.from(decodeDomainHashes(encoded))).toEqual(expected);
    });

    it('finds only the encoded hashes', () => {
        const hashes = decodeDomainHashes(encodeDomainHashes(['google.com', 'youtube.com', 'wikipedia.org']));
        expect(containsHash(hashes, fnv1a32('youtube.com'))).toBeTrue();
        expect(containsHash(hashes, fnv1a32('example.com'))).toBeFalse();
        expect(containsHash(new Uint32Array(0), fnv1a32('example.com'))).toBeFalse();
    });

    it('rejects malformed data', () => {
        const { count, data } = encodeDomainHashes(['google.com', 'youtube.com', 'wikipedia.org']);
        expect(() => decodeDomainHashes({ count: count + 1, data })).toThrow();
        expect(() => decodeDomainHashes({ count: count - 1, data })).toThrow();
        expect(() => decodeDomainHashes({ count, data: data.slice(0, -4) })).toThrow();
        expect(() => decodeDomainHashes({ count, data: '!not base64!' })).toThrow();
        expect(() => decodeDomainHashes({ count: -1, data })).toThrow();
    });
});
