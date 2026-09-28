/**
 * Builds the extension.
 *
 *   node scripts/build-tools/build.mjs --browser <chrome|firefox|embedded|chromium-embedded> --type <dev|release> [--watch] [--no-reloader]
 *
 * Output goes to build/<browser>/<type>. This is the Node replacement for the
 * Makefile's `dev`, `release` (minus `clean` and `npm`) and `watch` targets,
 * and produces the same files. It runs on Linux, macOS and Windows with no
 * tools beyond Node and the npm dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { bundleJs, watchJs } from './lib/bundles.mjs';
import {
    AUTOFILL_DIR,
    BROWSERS,
    CONTENT_SCOPE_SCRIPTS_DIR,
    DASHBOARD_DIR,
    ROOT_DIR,
    SURROGATES_DIR,
    TYPES,
    buildDirectories,
    resolveConfig,
} from './lib/config.mjs';
import { buildInjectScript, isLocalCheckout } from './lib/contentScopeScripts.mjs';
import { copyStaticFiles } from './lib/copy.mjs';
import { copyFonts } from './lib/fonts.mjs';
import { ensureDir, isBackupFile } from './lib/fs.mjs';
import { writeLocaleResources } from './lib/locales.mjs';
import { generateSmarterEncryptionRules } from './lib/smarterEncryption.mjs';
import { compileStyles } from './lib/styles.mjs';
import { writeSurrogatesList } from './lib/surrogates.mjs';

const USAGE = `Usage: node scripts/build-tools/build.mjs --browser <${BROWSERS.join('|')}> --type <${TYPES.join('|')}> [--watch] [--no-reloader]`;

/** @typedef {import('./lib/config.mjs').BuildConfig} BuildConfig */

/** Same format as the Makefile's \`date +"%Y%m%d_%H%M%S"\`. */
function buildTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    );
}

/**
 * Update buildtime.txt for development builds. The devbuild-reloader module
 * polls it and reloads the extension when it changes.
 * @param {BuildConfig} config
 */
function writeBuildTime({ dev, out }) {
    if (dev) {
        fs.writeFileSync(`${out.root}/buildtime.txt`, `${buildTimestamp()}\n`);
    }
}

/**
 * The steps other than JS bundling. Each is independent of the bundles, so a
 * caller can run just the ones affected by a change.
 * @type {Record<string, (config: BuildConfig) => void | Promise<void>>}
 */
const STEPS = {
    // The committed locale-resources.js, imported by the base.js bundle.
    locales: ({ ui }) => ui && writeLocaleResources(),
    copy: (config) => {
        copyStaticFiles(config);
        if (config.ui) writeSurrogatesList(config);
    },
    inject: (config) => config.ui && buildInjectScript(config),
    styles: (config) => compileStyles(config),
    fonts: (config) => config.ui && copyFonts(config),
    smarterEncryption: (config) => config.smarterEncryption && generateSmarterEncryptionRules(config),
};

/**
 * @param {BuildConfig} config
 * @param {Iterable<string>} steps Names from STEPS.
 */
async function runSteps(config, steps) {
    // Locale resources first, since the JS bundles import them.
    STEPS.locales(config);
    await Promise.all([...steps].filter((name) => name !== 'locales').map((name) => STEPS[name](config)));
}

/** @param {BuildConfig} config */
async function build(config) {
    const started = Date.now();
    buildDirectories(config).forEach(ensureDir);
    await Promise.all([runSteps(config, Object.keys(STEPS)), bundleJs(config)]);
    writeBuildTime(config);
    console.log(`Built ${config.browser} ${config.type} in ${config.out.root} (${Date.now() - started}ms)`);
}

/**
 * Which steps a changed source file affects. esbuild tracks the bundles' own
 * dependencies, so a change under shared/js needs nothing here unless it is a
 * content script that gets copied as-is.
 * @param {string} changedPath
 * @returns {string[]}
 */
function stepsAffectedBy(changedPath) {
    const p = changedPath.split(path.sep).join('/');
    if (p.startsWith('shared/scss/')) return ['styles'];
    if (p.startsWith('shared/locales/')) return ['locales'];
    if (p.startsWith('shared/data/bundled/')) return ['copy', 'inject'];
    if (p.startsWith(CONTENT_SCOPE_SCRIPTS_DIR)) return ['inject'];
    if (p.startsWith('shared/js/') && !p.startsWith('shared/js/content-scripts/')) return [];
    return ['copy'];
}

/**
 * Source directories whose changes need a step re-run. Only the parts of the
 * dependencies that the build actually copies are watched, resolving symlinks
 * (npm link) so that the real directories are watched.
 */
function watchedDirectories() {
    const dirs = ['browsers', 'shared', 'packages', DASHBOARD_DIR, AUTOFILL_DIR, SURROGATES_DIR, `${CONTENT_SCOPE_SCRIPTS_DIR}/build`];
    if (isLocalCheckout()) {
        dirs.push(`${CONTENT_SCOPE_SCRIPTS_DIR}/injected`);
    }
    return dirs.filter((dir) => fs.existsSync(dir));
}

function shouldIgnore(filename) {
    const parts = filename.split(/[\\/]/);
    return parts.includes('node_modules') || parts.includes('.git') || isBackupFile(filename);
}

/** Runs `fn` at most once per `ms` of quiet, collecting the arguments passed meanwhile. */
function debounce(fn, ms) {
    let timer;
    let queued = [];
    return (arg) => {
        queued.push(arg);
        clearTimeout(timer);
        timer = setTimeout(() => {
            const args = queued;
            queued = [];
            fn(args);
        }, ms);
    };
}

/** @param {BuildConfig} config */
async function watch(config) {
    const started = Date.now();
    buildDirectories(config).forEach(ensureDir);

    let rebuilding = Promise.resolve();
    const rebuild = debounce((changedPaths) => {
        const steps = new Set(changedPaths.flatMap(stepsAffectedBy));
        if (steps.size === 0) return;
        rebuilding = rebuilding
            .then(async () => {
                const rebuildStarted = Date.now();
                await runSteps(config, steps);
                writeBuildTime(config);
                console.log(`Rebuilt ${[...steps].join(', ')} (${Date.now() - rebuildStarted}ms)`);
            })
            .catch(console.error);
    }, 250);

    for (const dir of watchedDirectories()) {
        const realDir = fs.realpathSync(dir);
        fs.watch(realDir, { recursive: true }, (_, filename) => {
            if (filename && !shouldIgnore(filename)) {
                rebuild(path.join(dir, filename));
            }
        }).on('error', (e) => console.error(`Stopped watching ${dir}:`, e.message));
    }

    // esbuild rebuilds the bundles itself (and does the initial build here).
    // Bump buildtime.txt afterwards so the extension reloads.
    const bumpBuildTime = debounce(() => writeBuildTime(config), 100);
    await Promise.all([runSteps(config, Object.keys(STEPS)), watchJs(config, bumpBuildTime)]);
    console.log(`Built ${config.browser} ${config.type} in ${config.out.root} (${Date.now() - started}ms)`);
    if (isLocalCheckout()) {
        console.log(`Note: ${CONTENT_SCOPE_SCRIPTS_DIR} is a local checkout and will be rebuilt when its sources change.`);
    }
    console.log('\n** Build ready - Watching for changes **\n');
}

async function main() {
    const { values } = parseArgs({
        options: {
            browser: { type: 'string' },
            type: { type: 'string' },
            watch: { type: 'boolean', default: false },
            reloader: { type: 'boolean', default: true },
            help: { type: 'boolean', short: 'h', default: false },
        },
        allowNegative: true,
    });
    if (values.help || !values.browser || !values.type) {
        console.error(USAGE);
        process.exit(values.help ? 0 : 1);
    }

    process.chdir(ROOT_DIR);
    if (!fs.existsSync('node_modules/esbuild')) {
        console.error('Dependencies are not installed. Run `npm run install-ci` (or `npm ci --ignore-scripts`) first.');
        process.exit(1);
    }

    const config = resolveConfig({ browser: values.browser, type: values.type, reloader: values.reloader });
    await (values.watch ? watch(config) : build(config));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
