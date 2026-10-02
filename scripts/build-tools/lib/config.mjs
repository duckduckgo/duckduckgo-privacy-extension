/**
 * Build configuration. What differs between browser targets is described once,
 * in BROWSER_PROFILES, so the build steps only ever test semantic fields
 * (`ui`, `autofill`, ...) rather than browser names.
 *
 * The output layout mirrors the Makefile so both produce identical builds
 * while they coexist.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const TYPES = ['dev', 'release'];

export const BUILD_ROOT = 'build';
export const INTERMEDIATES_DIR = `${BUILD_ROOT}/.intermediates`;
export const SMARTER_ENCRYPTION_LIST = `${BUILD_ROOT}/.smarter_encryption.txt`;
export const SMARTER_ENCRYPTION_URL = 'https://staticcdn.duckduckgo.com/https/smarter_encryption.txt.gz';

export const CONTENT_SCOPE_SCRIPTS_DIR = 'node_modules/@duckduckgo/content-scope-scripts';
export const DASHBOARD_DIR = 'node_modules/@duckduckgo/privacy-dashboard/build/app';
export const AUTOFILL_DIR = 'node_modules/@duckduckgo/autofill/dist';
export const SURROGATES_DIR = 'node_modules/@duckduckgo/tracker-surrogates/surrogates';

export const FONT_URL = 'https://duckduckgo.com/font/all/';
export const FONT_FILES = [
    'ProximaNova-Reg-webfont.woff',
    'ProximaNova-Sbold-webfont.woff',
    'ProximaNova-Bold-webfont.woff',
    'ProximaNova-Reg-webfont.woff2',
    'ProximaNova-Bold-webfont.woff2',
];

const JS_BUNDLES = [
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

const SCSS_BUNDLES = [
    { in: 'shared/scss/base/base.scss', out: 'base.css' },
    { in: 'shared/scss/options.scss', out: 'options.css' },
    { in: 'shared/scss/feedback.scss', out: 'feedback.css' },
];

const only = (bundles, names) => bundles.filter(({ out }) => names.includes(out));

/** The content-scope-scripts build used by each platform. */
const CONTENT_SCOPE_SCRIPTS_BUILDS = { chrome: 'chrome-mv3', firefox: 'firefox' };

/**
 * @typedef {object} BrowserProfile
 * @property {'chrome'|'firefox'} platform Chrome-like or Firefox, for platform-specific dependencies.
 * @property {boolean} ui Ships the shared pages, dashboard, styles, fonts and surrogates.
 * @property {boolean} autofill Ships the autofill assets.
 * @property {boolean} smarterEncryption Bundles Smarter Encryption declarativeNetRequest rules.
 * @property {{in: string, out: string}[]} jsBundles
 * @property {{in: string, out: string}[]} scssBundles
 * @property {string[]} [htmlExcludes] Pages under shared/html not to ship.
 * @property {string} [dashboardCss] Extra CSS appended to the dashboard popup stylesheet.
 */

const CHROME = {
    platform: 'chrome',
    ui: true,
    autofill: true,
    smarterEncryption: true,
    jsBundles: JS_BUNDLES,
    scssBundles: SCSS_BUNDLES,
};

/** @type {Record<string, BrowserProfile>} */
const BROWSER_PROFILES = {
    chrome: CHROME,
    firefox: { ...CHROME, platform: 'firefox', smarterEncryption: false },
    // The minimal embedded build: manifest plus two bundles.
    embedded: {
        platform: 'chrome',
        ui: false,
        autofill: false,
        smarterEncryption: false,
        jsBundles: [
            { in: 'shared/js/background/background-embedded.js', out: 'background-embedded' },
            { in: 'shared/js/cpm.js', out: 'content-scripts/cpm' },
        ],
        scssBundles: [],
    },
    // A cut-down Chrome build. The browser owns the fire button and the new
    // tab page, there is no options page and MV3 has no background page, so
    // only the devtools pages (reached by URL) and their bundles remain.
    'chromium-embedded': {
        ...CHROME,
        autofill: false,
        jsBundles: only(JS_BUNDLES, ['background', 'devtools-panel', 'list-editor', 'rollouts', 'content-scripts/cpm']),
        scssBundles: only(SCSS_BUNDLES, ['base.css']),
        htmlExcludes: ['background.html', 'feedback.html', 'fire.html', 'options.html', 'tracker-stats.html'],
        // No options page, so hide the dashboard's settings cog (matches Windows).
        dashboardCss: '.cog-button { display: none; }\n',
    },
};

export const BROWSERS = Object.keys(BROWSER_PROFILES);

/**
 * @typedef {BrowserProfile & {
 *   browser: string,
 *   type: 'dev'|'release',
 *   dev: boolean,
 *   reloader: boolean,
 *   cssPlatform: 'chrome-mv3'|'firefox',
 *   out: ReturnType<typeof outputPaths>,
 * }} BuildConfig
 */

/** Where each kind of output goes, relative to the working directory. */
function outputPaths(buildDir) {
    return {
        root: buildDir,
        js: `${buildDir}/public/js`,
        contentScripts: `${buildDir}/public/js/content-scripts`,
        css: `${buildDir}/public/css`,
        font: `${buildDir}/public/font`,
        data: `${buildDir}/data`,
        dataBundled: `${buildDir}/data/bundled`,
        html: `${buildDir}/html`,
        img: `${buildDir}/img`,
        locales: `${buildDir}/_locales`,
        dashboard: `${buildDir}/dashboard`,
        surrogates: `${buildDir}/web_accessible_resources`,
    };
}

/**
 * @param {{browser: string, type: string, reloader?: boolean}} options
 * @returns {BuildConfig}
 */
export function resolveConfig({ browser, type, reloader = true }) {
    const profile = BROWSER_PROFILES[browser];
    if (!profile) {
        throw new Error(`Unknown browser "${browser}". Expected one of: ${BROWSERS.join(', ')}`);
    }
    if (!TYPES.includes(type)) {
        throw new Error(`Unknown build type "${type}". Expected one of: ${TYPES.join(', ')}`);
    }
    const dev = type === 'dev';
    return {
        ...profile,
        browser,
        type,
        dev,
        reloader: dev && reloader,
        cssPlatform: CONTENT_SCOPE_SCRIPTS_BUILDS[profile.platform],
        out: outputPaths(`${BUILD_ROOT}/${browser}/${type}`),
    };
}

/**
 * Directories created up front for every build (the Makefile's MKDIR_TARGETS),
 * so that the output tree matches exactly even where a directory ends up empty.
 * @param {BuildConfig} config
 */
export function buildDirectories({ out }) {
    return [
        out.dataBundled,
        out.html,
        out.img,
        out.dashboard,
        out.surrogates,
        out.contentScripts,
        out.css,
        out.font,
        out.locales,
        INTERMEDIATES_DIR,
    ];
}
