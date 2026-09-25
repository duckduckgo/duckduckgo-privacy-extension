/**
 * Compiles the SCSS. The sass CLI is used (rather than the JS API) so that the
 * output, including the .css.map files it writes by default, stays identical
 * to the Makefile's.
 */
import { runNodeBin } from './run.mjs';

/** @param {import('./config.mjs').BuildConfig} config */
export function compileStyles({ buildDir, scssBundles }) {
    for (const { in: input, out } of scssBundles) {
        runNodeBin('sass', [input, `${buildDir}/public/css/${out}`]);
    }
}
