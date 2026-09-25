/**
 * Helpers for running other tools. Node based tools are run by resolving their
 * bin script and executing it with the current Node binary, which needs no
 * shell and so behaves identically on Windows (where node_modules/.bin holds
 * .cmd shims rather than executables).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './config.mjs';

/**
 * Path of a package's bin script, read from its package.json. (Packages with
 * an `exports` map, such as sass, hide their bin script from require.resolve.)
 * @param {string} packageName
 * @param {string} [binName] Needed when the package has more than one bin.
 */
export function resolveBin(packageName, binName = packageName) {
    const packageDir = path.join(ROOT_DIR, 'node_modules', packageName);
    const { bin } = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
    const relative = typeof bin === 'string' ? bin : bin?.[binName];
    if (!relative) {
        throw new Error(`Package ${packageName} has no bin script named ${binName}`);
    }
    return path.join(packageDir, relative);
}

/**
 * @param {string} packageName e.g. 'sass'
 * @param {string[]} args
 * @param {import('node:child_process').SpawnSyncOptions & {binName?: string}} [options]
 */
export function runNodeBin(packageName, args, { binName, ...options } = {}) {
    const result = spawnSync(process.execPath, [resolveBin(packageName, binName), ...args], { stdio: 'inherit', ...options });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`${packageName} ${args.join(' ')} exited with status ${result.status}`);
    }
}

/**
 * Runs npm. npm itself is a .cmd file on Windows, so this is the one place a
 * shell is needed there.
 * @param {string[]} args
 * @param {string} [cwd]
 */
export function runNpm(args, cwd) {
    const result = spawnSync('npm', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`npm ${args.join(' ')} exited with status ${result.status}${cwd ? ` (in ${cwd})` : ''}`);
    }
}
