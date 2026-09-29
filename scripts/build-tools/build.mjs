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
import { parseArgs } from 'node:util';
import { bundleJs } from './lib/bundles.mjs';
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
 * A full build. Everything runs concurrently, except that the committed
 * locale-resources.js is written first because the base.js bundle imports it.
 * A warm rebuild takes well under a second, so watch mode simply calls this
 * on every change rather than working out which steps a change affects.
 * @param {BuildConfig} config
 */
async function build(config) {
    const started = Date.now();
    buildDirectories(config).forEach(ensureDir);
    const steps = [bundleJs(config), compileStyles(config)];
    copyStaticFiles(config);
    if (config.ui) {
        writeLocaleResources();
        writeSurrogatesList(config);
        buildInjectScript(config);
        steps.push(copyFonts(config));
    }
    if (config.smarterEncryption) {
        steps.push(generateSmarterEncryptionRules(config));
    }
    await Promise.all(steps);
    writeBuildTime(config);
    console.log(`Built ${config.browser} ${config.type} in ${config.out.root} (${Date.now() - started}ms)`);
}

/**
 * Source directories whose changes trigger a rebuild. Only the parts of the
 * dependencies that the build actually consumes are watched: a linked
 * checkout's own build output, plus its sources for content-scope-scripts,
 * which this build rebuilds itself.
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

/**
 * Builds, then rebuilds whenever a watched file changes. Changes are debounced
 * (editors often write a file several times), and a change arriving mid-build
 * queues one more build after it.
 * @param {BuildConfig} config
 */
async function watch(config) {
    await build(config);

    let building = Promise.resolve();
    let timer;
    const scheduleBuild = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            building = building.then(() => build(config)).catch(console.error);
        }, 250);
    };

    for (const dir of watchedDirectories()) {
        // Resolve symlinks (npm link) so that the real directory is watched.
        fs.watch(fs.realpathSync(dir), { recursive: true }, (_, filename) => {
            if (filename && !shouldIgnore(filename)) {
                scheduleBuild();
            }
        }).on('error', (e) => console.error(`Stopped watching ${dir}:`, e.message));
    }

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
