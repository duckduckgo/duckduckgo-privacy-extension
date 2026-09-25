/**
 * Shared configuration for the build scripts. Mirrors the variables at the top
 * of the Makefile so that both produce identical output while they coexist.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const BROWSERS = ['chrome', 'firefox', 'embedded'];
export const TYPES = ['dev', 'release'];

export const INTERMEDIATES_DIR = 'build/.intermediates';
export const SMARTER_ENCRYPTION_LIST = 'build/.smarter_encryption.txt';

export const CONTENT_SCOPE_SCRIPTS_DIR = 'node_modules/@duckduckgo/content-scope-scripts';

/** esbuild entry points shared by the chrome and firefox builds. */
export const JS_BUNDLES = [
    { in: 'shared/js/background/background.js', out: 'background' },
    { in: 'shared/js/ui/base/index.js', out: 'base' },
    { in: 'shared/js/ui/pages/feedback.js', out: 'feedback' },
    { in: 'shared/js/ui/pages/options.js', out: 'options' },
    { in: 'shared/js/devtools/panel.js', out: 'devtools-panel' },
    { in: 'shared/js/devtools/list-editor.js', out: 'list-editor' },
    { in: 'shared/js/devtools/rollouts.js', out: 'rollouts' },
    { in: 'shared/js/newtab/newtab.js', out: 'newtab' },
    { in: 'shared/js/fire/index.js', out: 'fire' },
    { in: 'shared/js/cpm.js', out: 'content-scripts/cpm' },
];

/** Embedded builds only need a couple of bundles. */
export const EMBEDDED_JS_BUNDLES = [
    { in: 'shared/js/background/background-embedded.js', out: 'background-embedded' },
    { in: 'shared/js/cpm.js', out: 'content-scripts/cpm' },
];

export const SCSS_BUNDLES = [
    { in: 'shared/scss/base/base.scss', out: 'base.css' },
    { in: 'shared/scss/options.scss', out: 'options.css' },
    { in: 'shared/scss/feedback.scss', out: 'feedback.css' },
];

export const FONT_FILES = [
    'ProximaNova-Reg-webfont.woff',
    'ProximaNova-Sbold-webfont.woff',
    'ProximaNova-Bold-webfont.woff',
    'ProximaNova-Reg-webfont.woff2',
    'ProximaNova-Bold-webfont.woff2',
];
export const FONT_URL = 'https://duckduckgo.com/font/all/';

export const SMARTER_ENCRYPTION_URL = 'https://staticcdn.duckduckgo.com/https/smarter_encryption.txt.gz';

/**
 * @typedef {object} BuildConfig
 * @property {'chrome'|'firefox'|'embedded'} browser
 * @property {'dev'|'release'} type
 * @property {'chrome'|'firefox'} browserType Used for autofill host styles.
 * @property {'chrome-mv3'|'firefox'} cssPlatform content-scope-scripts build name.
 * @property {string} buildDir e.g. build/chrome/dev
 * @property {boolean} dev
 * @property {boolean} reloader Include the auto-reload module.
 * @property {boolean} embedded
 */

/**
 * @param {{browser: string, type: string, reloader?: boolean}} options
 * @returns {BuildConfig}
 */
export function resolveConfig({ browser, type, reloader = true }) {
    if (!BROWSERS.includes(browser)) {
        throw new Error(`Unknown browser "${browser}". Expected one of: ${BROWSERS.join(', ')}`);
    }
    if (!TYPES.includes(type)) {
        throw new Error(`Unknown build type "${type}". Expected one of: ${TYPES.join(', ')}`);
    }
    const dev = type === 'dev';
    return {
        // @ts-ignore - validated above
        browser,
        // @ts-ignore - validated above
        type,
        browserType: browser === 'firefox' ? 'firefox' : 'chrome',
        cssPlatform: browser === 'firefox' ? 'firefox' : 'chrome-mv3',
        buildDir: `build/${browser}/${type}`,
        dev,
        reloader: dev && reloader,
        embedded: browser === 'embedded',
    };
}

/**
 * Directories the Makefile creates up front (MKDIR_TARGETS). Created for every
 * build so that the output tree matches exactly, even where a directory ends
 * up empty.
 * @param {BuildConfig} config
 */
export function buildDirectories({ buildDir }) {
    return [
        `${buildDir}/data/bundled`,
        `${buildDir}/html`,
        `${buildDir}/img`,
        `${buildDir}/dashboard`,
        `${buildDir}/web_accessible_resources`,
        `${buildDir}/public/js/content-scripts`,
        `${buildDir}/public/css`,
        `${buildDir}/public/font`,
        `${buildDir}/_locales`,
        INTERMEDIATES_DIR,
    ];
}
