/**
 * Generates the bundled Smarter Encryption declarativeNetRequest rules for
 * Chrome builds. The domain list is cached in build/.smarter_encryption.txt
 * (cleared by `clean`) so that it is fetched once per release build.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import zlib from 'node:zlib';
import { SMARTER_ENCRYPTION_LIST, SMARTER_ENCRYPTION_URL } from './config.mjs';
import { ensureDir, exists } from './fs.mjs';

const require = createRequire(import.meta.url);
const { generateSmarterEncryptionRuleset } = require('@duckduckgo/ddg2dnr/lib/smarterEncryption');

async function fetchDomainList() {
    if (exists(SMARTER_ENCRYPTION_LIST)) {
        return;
    }
    const response = await fetch(SMARTER_ENCRYPTION_URL);
    if (!response.ok) {
        throw new Error(`Failed to download Smarter Encryption list: HTTP ${response.status}`);
    }
    ensureDir('build');
    fs.writeFileSync(SMARTER_ENCRYPTION_LIST, zlib.gunzipSync(Buffer.from(await response.arrayBuffer())));
}

/** @param {import('./config.mjs').BuildConfig} config */
export async function generateSmarterEncryptionRules({ buildDir }) {
    await fetchDomainList();
    const domains = fs.readFileSync(SMARTER_ENCRYPTION_LIST, { encoding: 'utf8' }).split('\n');
    const ruleset = generateSmarterEncryptionRuleset(domains);
    ensureDir(`${buildDir}/data/bundled`);
    fs.writeFileSync(`${buildDir}/data/bundled/smarter-encryption-rules.json`, JSON.stringify(ruleset, null, '\t'));
}
