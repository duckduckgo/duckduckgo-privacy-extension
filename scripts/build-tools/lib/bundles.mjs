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
import { EMBEDDED_JS_BUNDLES, JS_BUNDLES } from './config.mjs';

/**
 * @param {import('./config.mjs').BuildConfig} config
 * @param {{in: string, out: string}} entryPoint
 * @returns {import('esbuild').BuildOptions}
 */
export function esbuildOptions({ browser, buildDir, dev, reloader }, entryPoint) {
    return {
        entryPoints: [entryPoint],
        outdir: `${buildDir}/public/js`,
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
function entryPoints({ embedded }) {
    return embedded ? EMBEDDED_JS_BUNDLES : JS_BUNDLES;
}

/** @param {import('./config.mjs').BuildConfig} config */
export async function bundleJs(config) {
    await Promise.all(entryPoints(config).map((entryPoint) => esbuildBuild(esbuildOptions(config, entryPoint))));
}

/**
 * Starts esbuild in watch mode, one context per bundle. Returns the contexts
 * so the caller can dispose of them. `onRebuild` runs after each successful
 * rebuild of any bundle.
 * @param {import('./config.mjs').BuildConfig} config
 * @param {() => void} onRebuild
 */
export async function watchJs(config, onRebuild) {
    const notifyPlugin = {
        name: 'notify-rebuild',
        setup(build) {
            build.onEnd((result) => {
                if (result.errors.length === 0) {
                    onRebuild();
                }
            });
        },
    };
    const contexts = await Promise.all(
        entryPoints(config).map((entryPoint) => esbuildContext({ ...esbuildOptions(config, entryPoint), plugins: [notifyPlugin] })),
    );
    await Promise.all(contexts.map((context) => context.watch()));
    return contexts;
}
