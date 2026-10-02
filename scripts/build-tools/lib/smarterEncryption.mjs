/**
 * Generates the bundled Smarter Encryption declarativeNetRequest rules. The
 * domain list is cached in build/.smarter_encryption.txt (removed by `clean`)
 * so that it is fetched once per release build, and the rules are only
 * regenerated when the list changes.
 */
import zlib from 'node:zlib';
import { SMARTER_ENCRYPTION_LIST, SMARTER_ENCRYPTION_URL } from './config.mjs';
import { fetchCached, isStale } from './fs.mjs';
import { runNodeBin } from './run.mjs';

/** @param {import('./config.mjs').BuildConfig} config */
export async function generateSmarterEncryptionRules({ out }) {
    await fetchCached(SMARTER_ENCRYPTION_URL, SMARTER_ENCRYPTION_LIST, (body) => zlib.gunzipSync(body));
    const rulesFile = `${out.dataBundled}/smarter-encryption-rules.json`;
    if (isStale(rulesFile, [SMARTER_ENCRYPTION_LIST])) {
        await runNodeBin('@duckduckgo/ddg2dnr', ['smarter-encryption', SMARTER_ENCRYPTION_LIST, rulesFile]);
    }
}
