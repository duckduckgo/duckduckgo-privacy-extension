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
 * Prints the usage line, with an optional message first, and exits.
 * @param {string} usage
 * @param {string} [message]
 * @returns {never}
 */
export function usageError(usage, message) {
    console.error(message ? `${message}\n${usage}` : usage);
    process.exit(1);
}

/**
 * Resolves the build target from parsed arguments, or prints `usage` and exits.
 * @param {{browser?: string, type?: string, reloader?: boolean}} values
 * @param {string} usage Full usage line for this command.
 * @returns {import('./config.mjs').BuildConfig}
 */
export function resolveTarget(values, usage) {
    if (!values.browser || !values.type) {
        return usageError(usage);
    }
    try {
        return resolveConfig({ browser: values.browser, type: values.type, reloader: values.reloader });
    } catch (e) {
        return usageError(usage, e.message);
    }
}
