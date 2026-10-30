/**
 * The New Tab Page, copied from the content-scope-scripts windows build and
 * served as an extension page.
 */
import fs from 'node:fs';
import { CONTENT_SCOPE_SCRIPTS_DIR } from './config.mjs';
import { copy } from './fs.mjs';

// TODO: temporary until extension pages are a first-class C-S-S build target,
// which removes the need for the windows build and the interop replacements below.
// https://app.asana.com/1/137249556945/project/1208671677432066/task/1218734043398971
const NTP_BUILD_DIR = `${CONTENT_SCOPE_SCRIPTS_DIR}/build/windows/pages/new-tab`;
const LOADING_COLOR = '#fafafa';
const FIRST_SCRIPT_TAG = '<script src="./dist/inline.js"></script>';
const SHIM_SCRIPT_TAG = '<script src="../public/js/ntp-interop-shim.js"></script>';

/**
 * Fills in the loading colour the native browser would substitute, and loads
 * the interop shim (shared/js/ntp/interop-shim.js) ahead of the page's own
 * scripts. Idempotent.
 * @param {string} htmlPath
 */
export function prepareNtpHtml(htmlPath) {
    let html = fs.readFileSync(htmlPath, 'utf8').replaceAll('$LOADING_COLOR$', LOADING_COLOR);
    if (!html.includes(SHIM_SCRIPT_TAG)) {
        if (!html.includes(FIRST_SCRIPT_TAG)) {
            throw new Error(`Could not find '${FIRST_SCRIPT_TAG}' in ${htmlPath} to insert the interop shim before.`);
        }
        html = html.replace(FIRST_SCRIPT_TAG, `${SHIM_SCRIPT_TAG}\n    ${FIRST_SCRIPT_TAG}`);
    }
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
