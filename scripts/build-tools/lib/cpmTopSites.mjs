/**
 * The CPM top sites list (see docs/cpm-site-rank.md) is gitignored. Without
 * it, the embedded build gets an empty list.
 */
import fs from 'node:fs';

export const CPM_TOP_SITES_FILE = 'shared/data/bundled/cpm-top-sites.json';

export function ensureCpmTopSites() {
    if (!fs.existsSync(CPM_TOP_SITES_FILE)) {
        fs.writeFileSync(CPM_TOP_SITES_FILE, '{ "count": 0, "data": "" }\n');
    }
}
