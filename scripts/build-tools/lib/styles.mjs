/**
 * Compiles the SCSS. The sass CLI is used (rather than the JS API) so that the
 * output, including the .css.map files it writes by default, stays identical
 * to the Makefile's. One invocation compiles every stylesheet.
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
