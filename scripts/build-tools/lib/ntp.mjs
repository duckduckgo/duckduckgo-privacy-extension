/**
 * The New Tab Page, copied from the content-scope-scripts chrome-mv3 build and
 * served as an extension page.
 */
import fs from 'node:fs';
import { CONTENT_SCOPE_SCRIPTS_DIR } from './config.mjs';
import { copy } from './fs.mjs';

export const NTP_BUILD_DIR = `${CONTENT_SCOPE_SCRIPTS_DIR}/build/chrome-mv3/pages/new-tab`;
const LOADING_COLOR = 'light-dark(#fafafa, #1c1c1c)';

/**
 * Fills in the loading colour the native browser would substitute. The page's
 * own color-scheme meta tag makes it follow the browser's light or dark theme.
 * Idempotent.
 * @param {string} htmlPath
 */
export function prepareNtpHtml(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8').replaceAll('$LOADING_COLOR$', LOADING_COLOR);
    fs.writeFileSync(htmlPath, html);
}

/** @param {string} dest */
export function copyNtp(dest) {
    if (!fs.existsSync(NTP_BUILD_DIR)) {
        throw new Error(
            `No New Tab Page build in ${NTP_BUILD_DIR}. If content-scope-scripts is linked to a local checkout, run "npm run build" in it.`,
        );
    }
    copy(NTP_BUILD_DIR, dest);
    prepareNtpHtml(`${dest}/index.html`);
}
