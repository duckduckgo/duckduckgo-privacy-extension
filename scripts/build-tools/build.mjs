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
import { bundleJs } from './lib/bundles.mjs';
import { TARGET_OPTIONS, TARGET_USAGE, resolveTarget } from './lib/cli.mjs';
import { AUTOFILL_DIR, CONTENT_SCOPE_SCRIPTS_DIR, DASHBOARD_DIR, ROOT_DIR, SURROGATES_DIR, buildDirectories } from './lib/config.mjs';
import { buildInjectScript, isContentScopeScriptsLinked, watchedPaths as contentScopeScriptsPaths } from './lib/contentScopeScripts.mjs';
import { copyStaticFiles } from './lib/copy.mjs';
import { copyFonts } from './lib/fonts.mjs';
import { ensureDir, isBackupFile, isWithin } from './lib/fs.mjs';
import { LOCALE_RESOURCES_FILE, writeLocaleResources } from './lib/locales.mjs';
import { settleAll } from './lib/run.mjs';
import { generateSmarterEncryptionRules } from './lib/smarterEncryption.mjs';
import { compileStyles } from './lib/styles.mjs';
import { writeSurrogatesList } from './lib/surrogates.mjs';

const USAGE = `Usage: node scripts/build-tools/build.mjs ${TARGET_USAGE} [--watch] [--no-reloader]`;

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
 *
 * Whatever fails, every step that was started is waited for before the error
 * is thrown, so a failed build never leaves steps writing output while the
 * next build starts.
 * @param {BuildConfig} config
 * @returns {Promise<string[]>} Every source file the JS bundles were built from (for watch mode).
 */
async function build(config) {
    const started = Date.now();
    buildDirectories(config).forEach(ensureDir);
    if (config.ui) {
        writeLocaleResources();
    }
    const steps = [bundleJs(config), compileStyles(config)];
    try {
        copyStaticFiles(config);
        if (config.ui) {
            writeSurrogatesList(config);
            buildInjectScript(config);
            steps.push(copyFonts(config));
        }
        if (config.smarterEncryption) {
            steps.push(generateSmarterEncryptionRules(config));
        }
    } catch (e) {
        // Reported ahead of any failed step, once every step has finished.
        steps.unshift(Promise.reject(e));
    }
    const [bundleInputs] = await settleAll(steps);
    writeBuildTime(config);
    console.log(`Built ${config.browser} ${config.type} in ${config.out.root} (${Date.now() - started}ms)`);
    return bundleInputs;
}

/**
 * Directories whose changes trigger a rebuild: the extension's own sources,
 * the dependency assets that are copied as-is, and the directories of every
 * file the JS bundles were built from that resolves outside node_modules,
 * which is to say inside an npm-linked checkout. (Installed packages only
 * change on npm install.) All of them must exist; a missing one means the
 * dependencies are not installed. Symlinks are resolved and directories
 * nested in another are dropped, so each real directory is watched once.
 * @param {string[]} bundleInputs From the esbuild metafiles.
 * @returns {[string, string][]} Pairs of directory as named and its real path.
 */
function watchedDirectories(bundleInputs) {
    const dirs = ['browsers', 'shared', 'packages', DASHBOARD_DIR, AUTOFILL_DIR, SURROGATES_DIR, ...contentScopeScriptsPaths()];
    const byRealPath = new Map(dirs.map((dir) => [fs.realpathSync(dir), dir]));
    for (const dir of new Set(bundleInputs.map((input) => path.dirname(input)))) {
        const real = fs.realpathSync(dir);
        if (!real.split(path.sep).includes('node_modules') && !byRealPath.has(real)) {
            byRealPath.set(real, dir);
        }
    }
    const reals = [...byRealPath.keys()];
    return [...byRealPath].filter(([real]) => !reals.some((other) => isWithin(other, real))).map(([real, dir]) => [dir, real]);
}

/**
 * Hidden and backup files are ignored so that editors' and sync tools'
 * temporary files do not trigger rebuilds, and so is the one source file the
 * build writes itself. Anything else under a watched directory does.
 * @param {string} dir The watched directory, as named.
 * @param {string} filename The changed file, relative to it.
 */
function shouldIgnore(dir, filename) {
    return (
        filename.split(/[\\/]/).some((part) => part.startsWith('.')) ||
        isBackupFile(filename) ||
        path.resolve(dir, filename) === path.resolve(LOCALE_RESOURCES_FILE)
    );
}

/**
 * Builds, then rebuilds whenever a watched file changes. Changes are debounced
 * (editors often write a file several times), and any number of changes that
 * arrive during a build result in exactly one more build after it. A failed
 * build is reported and watching continues.
 * @param {BuildConfig} config
 */
async function watch(config) {
    const bundleInputs = await build(config);

    let running = false;
    let pending = false;
    const rebuild = async () => {
        if (running) {
            pending = true;
            return;
        }
        running = true;
        do {
            pending = false;
            await build(config).catch(console.error);
        } while (pending);
        running = false;
    };
    let timer;
    const scheduleBuild = () => {
        clearTimeout(timer);
        timer = setTimeout(rebuild, 250);
    };

    for (const [dir, realDir] of watchedDirectories(bundleInputs)) {
        fs.watch(realDir, { recursive: true }, (_, filename) => {
            if (filename && !shouldIgnore(dir, filename)) {
                scheduleBuild();
            }
        }).on('error', (e) => console.error(`Stopped watching ${dir}:`, e.message));
    }

    if (isContentScopeScriptsLinked()) {
        console.log(`Note: ${CONTENT_SCOPE_SCRIPTS_DIR} is npm-linked to a local checkout, which will be rebuilt when its sources change.`);
    }
    console.log('\n** Build ready - Watching for changes **\n');
}

async function main() {
    const { values } = parseArgs({
        options: {
            ...TARGET_OPTIONS,
            watch: { type: 'boolean' },
            reloader: { type: 'boolean', default: true },
            help: { type: 'boolean', short: 'h' },
        },
        allowNegative: true,
    });
    if (values.help) {
        console.log(USAGE);
        process.exit(0);
    }
    const config = resolveTarget(values, USAGE);

    process.chdir(ROOT_DIR);
    if (!fs.existsSync('node_modules/esbuild')) {
        console.error('Dependencies are not installed. Run `npm run install-ci` (or `npm ci --ignore-scripts`) first.');
        process.exit(1);
    }

    await (values.watch ? watch(config) : build(config));
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
