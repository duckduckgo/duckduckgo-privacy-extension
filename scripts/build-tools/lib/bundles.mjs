/**
 * Bundles the extension's JavaScript with esbuild.
 *
 * Each entry point is bundled in its own esbuild build, as the Makefile does.
 * Bundling them together changes the output: several modules `require()`
 * tldts while others `import` it, and esbuild's choice between the package's
 * `main` and `module` fields depends on which it encounters first within a
 * build.
 */
import { build as esbuildBuild } from 'esbuild';
import { settleAll } from './run.mjs';

/**
 * @param {import('./config.mjs').BuildConfig} config
 * @param {{in: string, out: string}} entryPoint
 * @returns {import('esbuild').BuildOptions}
 */
function esbuildOptions({ browser, dev, reloader, out }, entryPoint) {
    return {
        entryPoints: [entryPoint],
        outdir: out.js,
        bundle: true,
        target: ['firefox91', 'chrome92'],
        // The Makefile pipes esbuild to stdout, which makes source maps inline.
        sourcemap: dev ? 'inline' : false,
        define: {
            BUILD_TARGET: JSON.stringify(browser),
            // Developer builds include the devbuilds module for debugging, and
            // (unless disabled) the auto-reload module.
            DEBUG: String(dev),
            RELOADER: String(reloader),
        },
        logLevel: 'warning',
        metafile: true,
    };
}

/**
 * Bundles every entry point.
 * @param {import('./config.mjs').BuildConfig} config
 * @returns {Promise<string[]>} Every source file the bundles were built from (for watch mode).
 */
export async function bundleJs(config) {
    const results = await settleAll(config.jsBundles.map((entryPoint) => esbuildBuild(esbuildOptions(config, entryPoint))));
    return results.flatMap((result) => Object.keys(result.metafile.inputs));
}
