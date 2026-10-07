/**
 * Produces public/js/inject.js from the content-scope-scripts package.
 *
 * Releases of content-scope-scripts ship prebuilt bundles, which are used
 * as-is. When the package is instead npm-linked to a local checkout (detected
 * by the presence of a .git directory), the checkout is rebuilt first when its
 * sources are newer than its build output, matching the Makefile.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_SCOPE_SCRIPTS_DIR as CSS_DIR } from './config.mjs';
import { ensureDir, isStale, touch } from './fs.mjs';
import { runNpm } from './run.mjs';

const TRACKER_LOOKUP = 'shared/data/bundled/tracker-lookup.json';
const EXTENSION_CONFIG = 'shared/data/bundled/extension-config.json';

// Layout of the content-scope-scripts package.
const PACKAGE_JSON = `${CSS_DIR}/package.json`;
const INJECTED_DIR = `${CSS_DIR}/injected`;
const BUILD_DIR = `${CSS_DIR}/build`;
const LOCALES_BUILD = `${BUILD_DIR}/locales`;
const prebuiltInject = (cssPlatform) => `${BUILD_DIR}/${cssPlatform}/inject.js`;

/** Sources that a rebuild of a linked checkout depends on. */
const LOCALE_INPUTS = [`${INJECTED_DIR}/src/locales`, `${INJECTED_DIR}/scripts`, PACKAGE_JSON];
const BUNDLE_INPUTS = [`${INJECTED_DIR}/src`, `${INJECTED_DIR}/entry-points`, `${INJECTED_DIR}/scripts`, PACKAGE_JSON, LOCALES_BUILD];

/** True when node_modules/@duckduckgo/content-scope-scripts is npm-linked to a local checkout. */
export function isContentScopeScriptsLinked() {
    return fs.existsSync(`${CSS_DIR}/.git`);
}

/**
 * What watch mode should watch for this package: the sources of a linked
 * checkout, otherwise the prebuilt bundles. A linked checkout's build output
 * is not watched, since this build produces it and would only rebuild again.
 */
export function watchedPaths() {
    return [isContentScopeScriptsLinked() ? INJECTED_DIR : BUILD_DIR];
}

/**
 * Paths under the watched directories that rebuilding a linked checkout
 * writes to, so that watch mode can ignore its own side effects.
 */
export function generatedPaths() {
    return [`${INJECTED_DIR}/integration-test`];
}

/**
 * Rebuilds the linked content-scope-scripts checkout if needed.
 * @param {import('./config.mjs').BuildConfig} config
 */
function rebuildLinkedCheckout({ cssPlatform }) {
    if (isStale(`${CSS_DIR}/node_modules`, [PACKAGE_JSON])) {
        runNpm(['install'], CSS_DIR);
        touch(`${CSS_DIR}/node_modules`);
    }
    if (isStale(LOCALES_BUILD, LOCALE_INPUTS)) {
        runNpm(['run', 'build-locales'], INJECTED_DIR);
        touch(LOCALES_BUILD);
    }
    if (isStale(prebuiltInject(cssPlatform), BUNDLE_INPUTS)) {
        runNpm(['run', `build-${cssPlatform}`], INJECTED_DIR);
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
    if (isContentScopeScriptsLinked()) {
        rebuildLinkedCheckout(config);
    }
    bundleContentScopeScripts(`${config.out.js}/inject.js`, prebuiltInject(config.cssPlatform));
}
