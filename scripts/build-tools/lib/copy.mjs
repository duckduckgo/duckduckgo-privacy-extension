/**
 * Copies the static parts of the extension into the build directory. This is
 * the `copy` target of the Makefile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTOFILL_DIR, BROWSERS_DIR, DASHBOARD_DIR, SURROGATES_DIR } from './config.mjs';
import { copy, copyEntries } from './fs.mjs';

const isJs = (name) => name.endsWith('.js');

/** @param {import('./config.mjs').BuildConfig} config */
export function copyStaticFiles({ browser, platform, ui, autofill, htmlExcludes = [], dashboardCss, out }) {
    copyEntries(`${BROWSERS_DIR}/${browser}`, out.root);

    if (!ui) {
        return;
    }

    copy(`${BROWSERS_DIR}/chrome/_locales`, out.locales);
    copy('shared/html', out.html, (source) => !htmlExcludes.includes(path.basename(source)));
    copy('shared/img', out.img);
    copy('shared/data', out.data);
    copyEntries(DASHBOARD_DIR, out.dashboard);
    copyEntries('shared/js/content-scripts', out.contentScripts, isJs);
    copyEntries(SURROGATES_DIR, out.surrogates);

    if (autofill) {
        copy(`${AUTOFILL_DIR}/autofill.css`, `${out.css}/autofill.css`);
        copy(`${AUTOFILL_DIR}/autofill-host-styles_${platform}.css`, `${out.css}/autofill-host-styles.css`);
        copyEntries(AUTOFILL_DIR, out.contentScripts, isJs);
    }

    if (dashboardCss) {
        fs.appendFileSync(`${out.dashboard}/public/css/popup.css`, dashboardCss);
    }
}
