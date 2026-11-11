/**
 * Compiles the SCSS with the sass CLI, which also writes .css.map files by
 * default. One invocation compiles every stylesheet.
 */
import { runNodeBin } from './run.mjs';

/** @param {import('./config.mjs').BuildConfig} config */
export async function compileStyles({ scssBundles, out }) {
    if (scssBundles.length > 0) {
        await runNodeBin(
            'sass',
            scssBundles.map((bundle) => `${bundle.in}:${out.css}/${bundle.out}`),
        );
    }
}
