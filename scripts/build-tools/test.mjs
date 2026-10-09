/**
 * Bundles and runs the unit tests. This is the Node replacement for the
 * Makefile's `unit-test` and `node-test` targets.
 *
 *   node scripts/build-tools/test.mjs unit   Browser tests, bundled into build/test and run with Karma.
 *   node scripts/build-tools/test.mjs node   Node tests, bundled into build/node and run with Jasmine.
 */
import { build as esbuildBuild } from 'esbuild';
import { ESBUILD_TARGET } from './lib/bundles.mjs';
import { ROOT_DIR } from './lib/config.mjs';
import { listFiles } from './lib/fs.mjs';
import { runNodeBin } from './lib/run.mjs';

const USAGE = 'Usage: node scripts/build-tools/test.mjs <unit|node>';

/** Shared by both test bundles: same compile target as the extension, no build-specific defines. */
const OPTIONS = {
    bundle: true,
    target: ESBUILD_TARGET,
    define: { BUILD_TARGET: '""', DEBUG: 'false', RELOADER: 'false' },
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
            outdir: 'build/test',
            sourcemap: 'inline',
        });
        await runNodeBin('karma', ['start', 'karma.conf.js']);
    },
    async node() {
        await esbuildBuild({
            ...OPTIONS,
            entryPoints: listFiles('unit-test/node', '.js', { recursive: true }),
            outdir: 'build/node',
            platform: 'node',
            external: ['jsdom'],
        });
        await runNodeBin('jasmine', listFiles('build/node', '.js', { recursive: true }));
    },
};

const suite = SUITES[process.argv[2]];
if (!suite) {
    console.error(USAGE);
    process.exit(1);
}
process.chdir(ROOT_DIR);
await suite();
