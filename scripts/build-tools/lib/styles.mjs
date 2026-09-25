/**
 * Compiles the SCSS. The sass CLI is used (rather than the JS API) so that the
 * output, including the .css.map files it writes by default, stays identical
 * to the Makefile's.
 */
import { SCSS_BUNDLES } from './config.mjs';
import { runNodeBin } from './run.mjs';

/** @param {import('./config.mjs').BuildConfig} config */
export function compileStyles({ buildDir }) {
    for (const { in: input, out } of SCSS_BUNDLES) {
        runNodeBin('sass', [input, `${buildDir}/public/css/${out}`]);
    }
}
