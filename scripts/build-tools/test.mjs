/**
 * Bundles and runs the unit tests. This is the Node replacement for the
 * Makefile's `unit-test` and `node-test` targets.
 *
 *   node scripts/build-tools/test.mjs unit   Browser tests, bundled into build/test and run with Karma.
 *   node scripts/build-tools/test.mjs node   Node tests, bundled into build/node and run with Jasmine.
 */
import { build as esbuildBuild } from 'esbuild';
import { ESBUILD_TARGET, esbuildDefines } from './lib/bundles.mjs';
import { usageError } from './lib/cli.mjs';
import { ROOT_DIR, TEST_BUILD_DIRS } from './lib/config.mjs';
import { listFiles } from './lib/fs.mjs';
import { runNodeBin } from './lib/run.mjs';

const USAGE = 'Usage: node scripts/build-tools/test.mjs <unit|node>';

/** Shared by both test bundles: compiled like the extension, as no particular browser or build type. */
const OPTIONS = {
    bundle: true,
    target: ESBUILD_TARGET,
    define: esbuildDefines({ browser: '', dev: false, reloader: false }),
    inject: ['./unit-test/inject-chrome-shim.js'],
    logLevel: 'warning',
};

const SUITES = {
    async unit() {
        await esbuildBuild({
            ...OPTIONS,
            entryPoints: [
                ...listFiles('unit-test/background', '.js', { recursive: true }),
                ...listFiles('unit-test/ui', '.js', { recursive: true }),
                ...listFiles('unit-test/shared-utils', '.js'),
            ],
            outdir: TEST_BUILD_DIRS.unit,
            sourcemap: 'inline',
        });
        await runNodeBin('karma', ['start', 'karma.conf.js']);
    },
    async node() {
        await esbuildBuild({
            ...OPTIONS,
            entryPoints: listFiles('unit-test/node', '.js', { recursive: true }),
            outdir: TEST_BUILD_DIRS.node,
            platform: 'node',
            external: ['jsdom'],
        });
        await runNodeBin('jasmine', listFiles(TEST_BUILD_DIRS.node, '.js', { recursive: true }));
    },
};

const suite = SUITES[process.argv[2]] ?? usageError(USAGE);
process.chdir(ROOT_DIR);
await suite();
