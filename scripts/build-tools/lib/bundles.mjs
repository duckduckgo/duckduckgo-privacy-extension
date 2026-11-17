/**
 * Bundles the extension's JavaScript with esbuild.
 *
 * Each entry point is bundled in its own esbuild build.
 * Bundling them together changes the output: several modules `require()`
 * tldts while others `import` it, and esbuild's choice between the package's
 * `main` and `module` fields depends on which it encounters first within a
 * build.
 */
import { build as esbuildBuild, buildSync } from 'esbuild';
import { settleAll } from './run.mjs';
import { writeFileSync } from 'fs';

/** Oldest browser versions the extension's JavaScript is compiled for. */
export const ESBUILD_TARGET = ['firefox91', 'chrome92'];

/**
 * The compile-time constants the extension's sources test.
 * @param {{browser: string, dev: boolean, reloader: boolean}} config
 */
export function esbuildDefines({ browser, dev, reloader }) {
    return {
        BUILD_TARGET: JSON.stringify(browser),
        // Developer builds include the devbuilds module for debugging, and
        // (unless disabled) the auto-reload module.
        DEBUG: String(dev),
        RELOADER: String(reloader),
    };
}

/**
 * @param {import('./config.mjs').BuildConfig} config
 * @param {{in: string, out: string}} entryPoint
 * @returns {import('esbuild').BuildOptions}
 */
function esbuildOptions(config, entryPoint) {
    return {
        entryPoints: [entryPoint],
        outdir: config.out.js,
        bundle: true,
        target: ESBUILD_TARGET,
        // Inline source maps keep dev and release builds to the same set of files.
        sourcemap: config.dev ? 'inline' : false,
        define: esbuildDefines(config),
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
    const results = await settleAll(
        config.jsBundles.map((entryPoint) => {
            const options = esbuildOptions(config, entryPoint);

            if (entryPoint.in === 'shared/js/cpm.js') {
                options.format = 'esm';
                options.write = false;
                const output = buildSync(options);
                const first = output.outputFiles[0];
                const string = String(first.text);
                const wrapped = `const ddg_main = () => {
${string.split('\n').map(x=>`   ${x}`).join('\n')}
};

if (window.location.href === 'about:blank') {
    console.log('skipping...')
} else {
    ddg_main();
}
`
                writeFileSync(output.outputFiles[0].path, wrapped);
                return output;
            }
            return esbuildBuild(options);
        }),
    );
    return results.flatMap((result) => Object.keys(result.metafile.inputs));
}
