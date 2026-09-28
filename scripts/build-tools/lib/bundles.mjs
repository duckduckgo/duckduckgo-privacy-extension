/**
 * Bundles the extension's JavaScript with esbuild.
 *
 * Each entry point is bundled in its own esbuild build, as the Makefile does.
 * Bundling them together changes the output: several modules `require()`
 * tldts while others `import` it, and esbuild's choice between the package's
 * `main` and `module` fields depends on which it encounters first within a
 * build.
 */
import { build as esbuildBuild, context as esbuildContext } from 'esbuild';

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
    };
}

/** @param {import('./config.mjs').BuildConfig} config */
export async function bundleJs(config) {
    await Promise.all(config.jsBundles.map((entryPoint) => esbuildBuild(esbuildOptions(config, entryPoint))));
}

/**
 * Bundles once, then keeps the bundles up to date as their sources change.
 * Resolves after the initial build of every bundle; `onRebuild` runs after
 * each successful build, the initial ones included.
 * @param {import('./config.mjs').BuildConfig} config
 * @param {() => void} onRebuild
 */
export async function watchJs(config, onRebuild) {
    await Promise.all(
        config.jsBundles.map(async (entryPoint) => {
            let initialBuild;
            const initialBuildDone = new Promise((resolve) => {
                initialBuild = resolve;
            });
            const plugin = {
                name: 'notify-rebuild',
                setup(build) {
                    build.onEnd((result) => {
                        initialBuild();
                        if (result.errors.length === 0) {
                            onRebuild();
                        }
                    });
                },
            };
            const context = await esbuildContext({ ...esbuildOptions(config, entryPoint), plugins: [plugin] });
            await context.watch();
            await initialBuildDone;
        }),
    );
}
