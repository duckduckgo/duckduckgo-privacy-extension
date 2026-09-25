/**
 * Builds the extension.
 *
 *   node scripts/build-tools/build.mjs --browser <chrome|firefox|embedded> --type <dev|release> [--watch] [--no-reloader]
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
import { BROWSERS, CONTENT_SCOPE_SCRIPTS_DIR, ROOT_DIR, TYPES, buildDirectories, resolveConfig } from './lib/config.mjs';
import { buildInjectScript, isLocalCheckout } from './lib/contentScopeScripts.mjs';
import { copyStaticFiles } from './lib/copy.mjs';
import { copyFonts } from './lib/fonts.mjs';
import { ensureDir, exists } from './lib/fs.mjs';
import { writeLocaleResources } from './lib/locales.mjs';
import { generateSmarterEncryptionRules } from './lib/smarterEncryption.mjs';
import { compileStyles } from './lib/styles.mjs';
import { writeSurrogatesList } from './lib/surrogates.mjs';

const USAGE = `Usage: node scripts/build-tools/build.mjs --browser <${BROWSERS.join('|')}> --type <${TYPES.join('|')}> [--watch] [--no-reloader]`;

/** Same format as the Makefile's \`date +"%Y%m%d_%H%M%S"\`. */
function buildTimestamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
        `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
}

/**
 * Update buildtime.txt for development builds. The devbuild-reloader module
 * polls it and reloads the extension when it changes.
 * @param {import('./lib/config.mjs').BuildConfig} config
 */
function writeBuildTime({ buildDir, dev }) {
    if (dev) {
        fs.writeFileSync(`${buildDir}/buildtime.txt`, `${buildTimestamp()}\n`);
    }
}

/**
 * Everything except the esbuild bundles, which are handled separately so
 * that watch mode can use esbuild's incremental rebuilds.
 * @param {import('./lib/config.mjs').BuildConfig} config
 */
async function buildStaticParts(config) {
    buildDirectories(config).forEach(ensureDir);
    copyStaticFiles(config);
    if (!config.embedded) {
        writeLocaleResources();
        buildInjectScript(config);
        compileStyles(config);
        writeSurrogatesList(config);
    }
    const downloads = [];
    if (!config.embedded) {
        downloads.push(copyFonts(config));
    }
    if (config.browser === 'chrome') {
        downloads.push(generateSmarterEncryptionRules(config));
    }
    await Promise.all(downloads);
}

/** @param {import('./lib/config.mjs').BuildConfig} config */
async function build(config) {
    const started = Date.now();
    await Promise.all([buildStaticParts(config), bundleJs(config)]);
    writeBuildTime(config);
    console.log(`Built ${config.browser} ${config.type} in ${config.buildDir} (${Date.now() - started}ms)`);
}

/**
 * Directories whose changes should trigger a rebuild of the static parts.
 * esbuild tracks the dependencies of the JS bundles itself.
 */
function watchedDirectories() {
    const dirs = ['browsers', 'shared', 'packages'];
    if (exists('node_modules/@duckduckgo')) {
        for (const name of fs.readdirSync('node_modules/@duckduckgo')) {
            dirs.push(path.join('node_modules/@duckduckgo', name));
        }
    }
    // Resolve symlinks (npm link) so that the real directories are watched.
    return dirs.filter(exists).map((dir) => fs.realpathSync(dir));
}

function shouldIgnore(filename) {
    if (!filename) return false;
    const parts = filename.split(/[\\/]/);
    return parts.includes('node_modules') || parts.includes('.git') || parts.includes('build') || filename.endsWith('~');
}

/** @param {import('./lib/config.mjs').BuildConfig} config */
async function watch(config) {
    await build(config);

    // Rebuilding a linked content-scope-scripts checkout is slow, so only do
    // it when its own sources change, and note that in the output.
    if (isLocalCheckout()) {
        console.log(`Note: ${CONTENT_SCOPE_SCRIPTS_DIR} is a local checkout and will be rebuilt when its sources change.`);
    }

    let pending = null;
    let building = false;
    const rebuildStatic = async () => {
        pending = null;
        if (building) {
            // A change arrived mid-build; run again once it finishes.
            pending = setTimeout(rebuildStatic, 250);
            return;
        }
        building = true;
        const started = Date.now();
        try {
            await buildStaticParts(config);
            writeBuildTime(config);
            console.log(`Rebuilt static files (${Date.now() - started}ms)`);
        } catch (e) {
            console.error(e);
        } finally {
            building = false;
        }
    };
    const scheduleRebuild = (eventType, filename) => {
        if (shouldIgnore(filename)) return;
        clearTimeout(pending);
        pending = setTimeout(rebuildStatic, 250);
    };

    for (const dir of watchedDirectories()) {
        fs.watch(dir, { recursive: true }, scheduleRebuild);
    }
    // esbuild rebuilds the bundles itself. Bump buildtime.txt afterwards so
    // the extension reloads.
    await watchJs(config, () => writeBuildTime(config));

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
    if (!exists('node_modules/esbuild')) {
        console.error('Dependencies are not installed. Run `npm run install-ci` (or `npm ci --ignore-scripts`) first.');
        process.exit(1);
    }

    const config = resolveConfig({ browser: values.browser, type: values.type, reloader: values.reloader });
    if (values.watch) {
        await watch(config);
    } else {
        await build(config);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
