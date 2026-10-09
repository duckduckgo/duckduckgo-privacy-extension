/**
 * Command line handling shared by the build-tools entry points, which all
 * take a build target as `--browser <name> --type <dev|release>`.
 */
import { BROWSERS, TYPES, resolveConfig } from './config.mjs';

/** parseArgs option definitions for the target. */
export const TARGET_OPTIONS = {
    browser: { type: 'string' },
    type: { type: 'string' },
};

export const TARGET_USAGE = `--browser <${BROWSERS.join('|')}> --type <${TYPES.join('|')}>`;

/**
 * Resolves the build target from parsed arguments, or prints `usage` and exits.
 * @param {{browser?: string, type?: string, reloader?: boolean}} values
 * @param {string} usage Full usage line for this command.
 * @returns {import('./config.mjs').BuildConfig}
 */
export function resolveTarget(values, usage) {
    if (!values.browser || !values.type) {
        console.error(usage);
        process.exit(1);
    }
    try {
        return resolveConfig({ browser: values.browser, type: values.type, reloader: values.reloader });
    } catch (e) {
        console.error(`${e.message}\n${usage}`);
        process.exit(1);
    }
}
