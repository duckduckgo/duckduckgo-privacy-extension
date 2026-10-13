# CPM site rank

> [!WARNING]
> **Release builds don't include the top sites list yet.** The list is gitignored and built locally. GitHub Actions builds releases (`release-embedded.yml`) from a fresh checkout, where the build writes an empty placeholder instead. With an empty list the lookup is off, so `autoconsent_summary` never carries `siteRank`, and nothing fails or warns. Before this ships, decide how release builds get the list.

The embedded build (`background-embedded.js`) adds `siteRank=top10k|other` to the CPM `autoconsent_summary` pixel. The bucket comes from the tab's top-level URL and is looked up on the device. Chrome and Firefox builds include neither the lookup nor the list.

## How the lookup works

`shared/data/bundled/cpm-top-sites.json` holds the 32-bit FNV-1a hashes of the top sites' registrable domains, sorted and stored as base64 LEB128 varints of the gaps between hashes. `shared/js/background/components/cpm-site-rank.js` hashes each suffix of the hostname with at least two labels (`example.co.uk`, then `www.example.co.uk`) and binary-searches for it. It doesn't need the Public Suffix List.

A site outside the list lands in `top10k` only when one of its suffixes shares a hash with a top site: about 1 in 400,000 per suffix for 10,000 sites.

## Porting the lookup

Every implementation, including the build script, must agree on these:

- Hash the hostname as the browser reports it: lowercase, without a trailing dot, with IDNs in punycode (`xn--…`). Punycode is ASCII, so hashing UTF-16 code units in JS equals hashing bytes.
- FNV-1a is unsigned 32-bit arithmetic. In JS, multiply with `Math.imul` and finish with `>>> 0`; a plain `*` loses precision. In Swift, use `UInt32` with `&*`.
- Check suffixes with at least two labels, shortest first. IP addresses need no special case: the list never contains them.

Test vectors (32-bit FNV-1a):

| Input | Hash |
|---|---|
| `""` | `0x811c9dc5` |
| `example.com` | `0x431ceb26` |
| `www.example.com` | `0x88469fcb` |
| `bbc.co.uk` | `0xe55ec88c` |
| `xn--bcher-kva.de` (bücher.de) | `0x0d16ee2d` |

`unit-test/background/cpm-site-rank.js` checks the same vectors.

## Building the list

```sh
node scripts/build-cpm-top-sites.mjs -i <list file>
```

The input is a ranked list (`rank,domain` CSV, CrUX `origin,rank`, or one domain per line). The script takes the top 10,000 entries and reduces them to registrable domains. Private suffixes such as `github.io` count as public suffixes, so a bare `github.io` entry is dropped and its users' sites don't all land in `top10k`. When the file is missing, both the Makefile and `scripts/build-tools` write an empty placeholder.
