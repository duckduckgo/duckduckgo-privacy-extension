/**
 * Copies the static parts of the extension into the build directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTOFILL_DIR, BROWSERS_DIR, DASHBOARD_DIR, SURROGATES_DIR } from './config.mjs';
import { copy, copyEntries } from './fs.mjs';
import { copyNtp } from './ntp.mjs';

const isJs = (name) => name.endsWith('.js');

/** @param {import('./config.mjs').BuildConfig} config */
export function copyStaticFiles({ browser, platform, ui, autofill, ntp, htmlExcludes = [], dashboardCss, cpmSkipBlankFrames, out }) {
    copyEntries(`${BROWSERS_DIR}/${browser}`, out.root);

    // TEMPORARY: CPM experiment, don't inject content scripts into about:blank/srcdoc/data:/blob: frames at all
    if (cpmSkipBlankFrames) {
        const manifestPath = `${out.root}/manifest.json`;
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        for (const script of manifest.content_scripts) {
            delete script.match_origin_as_fallback;
            delete script.match_about_blank;
        }
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
    }

    if (!ui) {
        return;
    }

    copy(`${BROWSERS_DIR}/chrome/_locales`, out.locales);
    copy('shared/html', out.html, (source) => !htmlExcludes.includes(path.basename(source)));
    copy('shared/img', out.img);
    copy('shared/data', out.data, (source) => path.basename(source) !== 'site-buckets.json');
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

    if (ntp) {
        copyNtp(out.ntp);
    }
}
