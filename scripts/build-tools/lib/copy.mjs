/**
 * Copies the static parts of the extension into the build directory. This is
 * the `copy` target of the Makefile.
 */
import { copy, copyEntries } from './fs.mjs';

const AUTOFILL_DIR = 'node_modules/@duckduckgo/autofill/dist';

/** @param {import('./config.mjs').BuildConfig} config */
export function copyStaticFiles({ browser, browserType, buildDir, embedded }) {
    copyEntries(`browsers/${browser}`, buildDir);

    if (embedded) {
        return;
    }

    copy('browsers/chrome/_locales', `${buildDir}/_locales`);
    copy('shared/html', `${buildDir}/html`);
    copy('shared/img', `${buildDir}/img`);
    copy('shared/data', `${buildDir}/data`);

    copyEntries('node_modules/@duckduckgo/privacy-dashboard/build/app', `${buildDir}/dashboard`);

    copy(`${AUTOFILL_DIR}/autofill.css`, `${buildDir}/public/css/autofill.css`);
    copy(`${AUTOFILL_DIR}/autofill-host-styles_${browserType}.css`, `${buildDir}/public/css/autofill-host-styles.css`);

    const isJs = (name) => name.endsWith('.js');
    copyEntries(AUTOFILL_DIR, `${buildDir}/public/js/content-scripts`, isJs);
    copyEntries('shared/js/content-scripts', `${buildDir}/public/js/content-scripts`, isJs);

    copyEntries('node_modules/@duckduckgo/tracker-surrogates/surrogates', `${buildDir}/web_accessible_resources`);
}
