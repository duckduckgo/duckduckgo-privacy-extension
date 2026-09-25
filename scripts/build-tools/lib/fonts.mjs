/**
 * Fetches the web fonts, caching them in build/.intermediates so they are only
 * downloaded once, then copies them into the build.
 */
import fs from 'node:fs';
import { FONT_FILES, FONT_URL, INTERMEDIATES_DIR } from './config.mjs';
import { copy, ensureDir, exists } from './fs.mjs';

/** @param {string} name */
async function fetchFont(name) {
    const cached = `${INTERMEDIATES_DIR}/${name}`;
    if (exists(cached)) {
        return;
    }
    const response = await fetch(FONT_URL + name);
    if (!response.ok) {
        throw new Error(`Failed to download font ${name}: HTTP ${response.status}`);
    }
    ensureDir(INTERMEDIATES_DIR);
    fs.writeFileSync(cached, Buffer.from(await response.arrayBuffer()));
}

/** @param {import('./config.mjs').BuildConfig} config */
export async function copyFonts({ buildDir }) {
    await Promise.all(FONT_FILES.map(fetchFont));
    for (const name of FONT_FILES) {
        copy(`${INTERMEDIATES_DIR}/${name}`, `${buildDir}/public/font/${name}`);
    }
}
