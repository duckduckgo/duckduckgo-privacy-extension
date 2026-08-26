/**
 * Prepare the New Tab Page's index.html (copied from the windows build in
 * @duckduckgo/content-scope-scripts) for serving as an extension page:
 *
 *  1. Replace the `$LOADING_COLOR$` token. On Windows the native browser
 *     substitutes this when serving the page; here nothing does, so a
 *     hardcoded default is used for now.
 *  2. Load the windows interop shim (see shared/js/ntp/interop-shim.js)
 *     before the page's own scripts, so that the `windowsInterop*` globals
 *     exist by the time the page's messaging layer looks for them. The shim
 *     must be an external script because the extension's CSP disallows
 *     inline scripts.
 *
 * Usage: node scripts/prepareNtpHtml.mjs <path-to-copied-index.html>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LOADING_COLOR = '#fafafa';
const SHIM_SCRIPT_TAG = '<script src="./interop-shim.js"></script>';
const FIRST_SCRIPT_TAG = '<script src="./dist/inline.js"></script>';

const htmlPath = process.argv[2];
if (!htmlPath) {
    console.error('Usage: node scripts/prepareNtpHtml.mjs <path-to-copied-index.html>');
    process.exit(1);
}

let html = readFileSync(htmlPath, 'utf8');

html = html.replaceAll('$LOADING_COLOR$', LOADING_COLOR);

if (!html.includes(SHIM_SCRIPT_TAG)) {
    if (!html.includes(FIRST_SCRIPT_TAG)) {
        throw new Error(`Could not find '${FIRST_SCRIPT_TAG}' in ${htmlPath} to insert the interop shim before.`);
    }
    html = html.replace(FIRST_SCRIPT_TAG, `${SHIM_SCRIPT_TAG}\n    ${FIRST_SCRIPT_TAG}`);
}

writeFileSync(htmlPath, html);
