/**
 * Fetches the web fonts, caching them in build/.intermediates so they are only
 * downloaded once, then copies them into the build.
 */
import { FONT_FILES, FONT_URL, INTERMEDIATES_DIR } from './config.mjs';
import { copy, fetchCached } from './fs.mjs';

/** @param {import('./config.mjs').BuildConfig} config */
export async function copyFonts({ out }) {
    await Promise.all(FONT_FILES.map((name) => fetchCached(FONT_URL + name, `${INTERMEDIATES_DIR}/${name}`)));
    for (const name of FONT_FILES) {
        copy(`${INTERMEDIATES_DIR}/${name}`, `${out.font}/${name}`);
    }
}
