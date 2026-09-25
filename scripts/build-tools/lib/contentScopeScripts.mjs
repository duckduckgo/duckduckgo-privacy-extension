/**
 * Produces public/js/inject.js from the content-scope-scripts package.
 *
 * Releases of content-scope-scripts ship prebuilt bundles, which are used
 * as-is. When the package is a local checkout instead (e.g. via `npm link`,
 * detected by the presence of a .git directory), it is rebuilt first when its
 * sources are newer than its build output, matching the Makefile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_SCOPE_SCRIPTS_DIR as CSS_DIR } from './config.mjs';
import { ensureDir, exists, isStale } from './fs.mjs';
import { runNpm } from './run.mjs';

const TRACKER_LOOKUP = 'shared/data/bundled/tracker-lookup.json';
const EXTENSION_CONFIG = 'shared/data/bundled/extension-config.json';

/** Sources that a rebuild of a linked checkout depends on. */
const LOCALE_INPUTS = [`${CSS_DIR}/injected/src/locales`, `${CSS_DIR}/injected/scripts`, `${CSS_DIR}/package.json`];
const BUNDLE_INPUTS = [
    `${CSS_DIR}/injected/src`,
    `${CSS_DIR}/injected/entry-points`,
    `${CSS_DIR}/injected/scripts`,
    `${CSS_DIR}/package.json`,
    `${CSS_DIR}/build/locales`,
];

export function isLocalCheckout() {
    return exists(`${CSS_DIR}/.git`);
}

/**
 * Rebuilds a local content-scope-scripts checkout if needed.
 * @param {import('./config.mjs').BuildConfig} config
 */
export function rebuildLocalCheckout({ cssPlatform }) {
    if (!isLocalCheckout()) {
        return;
    }
    const injectedDir = `${CSS_DIR}/injected`;
    if (isStale(`${CSS_DIR}/node_modules`, [`${CSS_DIR}/package.json`])) {
        runNpm(['install'], CSS_DIR);
        // Match `touch`, so that node_modules is newer than package.json.
        fs.utimesSync(`${CSS_DIR}/node_modules`, new Date(), new Date());
    }
    if (isStale(`${CSS_DIR}/build/locales`, LOCALE_INPUTS)) {
        runNpm(['run', 'build-locales'], injectedDir);
        fs.utimesSync(`${CSS_DIR}/build/locales`, new Date(), new Date());
    }
    if (isStale(`${CSS_DIR}/build/${cssPlatform}/inject.js`, BUNDLE_INPUTS)) {
        runNpm(['run', `build-${cssPlatform}`], injectedDir);
    }
}

/**
 * Splices the bundled tracker lookup and (a subset of) the bundled extension
 * configuration into the content-scope-scripts bundle.
 * @param {string} targetPath
 * @param {string} sourcePath
 * @param {string} [trackerLookupPath]
 * @param {string} [configPath]
 */
export function bundleContentScopeScripts(targetPath, sourcePath, trackerLookupPath = TRACKER_LOOKUP, configPath = EXTENSION_CONFIG) {
    const utf8 = { encoding: 'utf-8' };
    const source = fs.readFileSync(sourcePath, utf8);
    const trackerLookup = fs.readFileSync(trackerLookupPath, utf8);
    const config = JSON.parse(fs.readFileSync(configPath, utf8));
    config.features = {
        navigatorInterface: config.features.navigatorInterface,
        cookie: config.features.cookie,
        adClickAttribution: config.features.adClickAttribution,
    };
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(
        targetPath,
        source.replace('$TRACKER_LOOKUP$', trackerLookup).replace('$BUNDLED_CONFIG$', JSON.stringify(config)),
        utf8,
    );
}

/** @param {import('./config.mjs').BuildConfig} config */
export function buildInjectScript(config) {
    rebuildLocalCheckout(config);
    bundleContentScopeScripts(`${config.buildDir}/public/js/inject.js`, `${CSS_DIR}/build/${config.cssPlatform}/inject.js`);
}
