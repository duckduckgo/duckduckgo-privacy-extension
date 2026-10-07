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
import {
    buildInjectScript,
    generatedPaths as contentScopeScriptsGeneratedPaths,
    isContentScopeScriptsLinked,
    watchedPaths as contentScopeScriptsPaths,
} from './lib/contentScopeScripts.mjs';
import { copyStaticFiles } from './lib/copy.mjs';
import { copyFonts } from './lib/fonts.mjs';
import { ensureDir, isBackupFile } from './lib/fs.mjs';
import { LOCALE_RESOURCES_FILE, writeLocaleResources } from './lib/locales.mjs';
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
 * @returns {Promise<string[]>} Every source file the JS bundles were built from.
 */
async function build(config) {
    const started = Date.now();
    buildDirectories(config).forEach(ensureDir);
    if (config.ui) {
        writeLocaleResources();
    }
    const bundles = bundleJs(config);
    const steps = [bundles, compileStyles(config)];
    let error;
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
        error = e;
    }
    const failed = (await Promise.allSettled(steps)).find((result) => result.status === 'rejected');
    if (error || failed) {
        throw error || failed.reason;
    }
    writeBuildTime(config);
    console.log(`Built ${config.browser} ${config.type} in ${config.out.root} (${Date.now() - started}ms)`);
    return await bundles;
}

/**
 * Source directories whose changes trigger a rebuild: the extension's own
 * sources, the dependency assets that are copied as-is, and the directories
 * of every @duckduckgo package file that the JS bundles were built from, so
 * that an npm-linked dependency rebuilds the extension when its build changes.
 * All of them must exist; a missing one means the dependencies are not
 * installed. Symlinks (npm link) are resolved and nested directories dropped,
 * so each real directory is watched once.
 * @param {string[]} bundleInputs From the esbuild metafiles.
 */
function watchedDirectories(bundleInputs) {
    const dependencyDirs = bundleInputs
        .filter((input) => input.startsWith('node_modules/@duckduckgo/'))
        .map((input) => path.dirname(input));
    const dirs = [
        'browsers',
        'shared',
        'packages',
        DASHBOARD_DIR,
        AUTOFILL_DIR,
        SURROGATES_DIR,
        ...contentScopeScriptsPaths(),
        ...dependencyDirs,
    ];
    const real = new Map(dirs.map((dir) => [dir, fs.realpathSync(dir)]));
    const isNested = (dir) => [...real.values()].some((other) => other !== real.get(dir) && real.get(dir).startsWith(other + path.sep));
    return [...new Set(dirs)].filter((dir) => !isNested(dir));
}

/** Files under the watched directories that the build writes itself. */
const GENERATED_PATHS = [LOCALE_RESOURCES_FILE, ...contentScopeScriptsGeneratedPaths()].map((p) => path.normalize(p));

function isGeneratedByBuild(filePath) {
    return GENERATED_PATHS.some((generated) => filePath === generated || filePath.startsWith(generated + path.sep));
}

/**
 * Hidden and backup files are ignored so that editors' and sync tools'
 * temporary files do not trigger rebuilds. Anything else under a watched
 * directory does.
 */
function shouldIgnore(filename) {
    return filename.split(/[\\/]/).some((part) => part.startsWith('.')) || isBackupFile(filename);
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

    for (const dir of watchedDirectories(bundleInputs)) {
        fs.watch(fs.realpathSync(dir), { recursive: true }, (_, filename) => {
            if (filename && !shouldIgnore(filename) && !isGeneratedByBuild(path.join(dir, filename))) {
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
