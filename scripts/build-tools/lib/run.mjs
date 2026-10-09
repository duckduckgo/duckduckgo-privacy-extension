/**
 * Helpers for running other tools and concurrent build steps. Node based tools
 * are run by resolving their bin script and executing it with the current Node
 * binary, which needs no shell and so behaves identically on Windows (where
 * node_modules/.bin holds .cmd shims rather than executables).
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT_DIR } from './config.mjs';

/**
 * Path of a package's bin script, read from its package.json. (Packages with
 * an `exports` map, such as sass, hide their bin script from require.resolve.)
 * @param {string} packageName
 */
function resolveBin(packageName) {
    const packageDir = path.join(ROOT_DIR, 'node_modules', packageName);
    const { bin } = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
    const relative = typeof bin === 'string' ? bin : Object.values(bin)[0];
    return path.join(packageDir, relative);
}

const exitError = (label, status) => new Error(`${label} exited with status ${status}`);

/**
 * Like Promise.all, but waits for every promise to settle before throwing the
 * first rejection, so that a failed step never leaves the others writing
 * output in the background while the caller moves on.
 * @template T
 * @param {Promise<T>[]} promises
 * @returns {Promise<T[]>}
 */
export async function settleAll(promises) {
    const results = await Promise.allSettled(promises);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
        throw failed.reason;
    }
    return results.map((result) => result.value);
}

/**
 * Runs a Node based tool asynchronously, so it can overlap with other work.
 * @param {string} packageName e.g. 'sass'
 * @param {string[]} args
 */
export function runNodeBin(packageName, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [resolveBin(packageName), ...args], { stdio: 'inherit' });
        child.on('error', reject);
        child.on('exit', (status) => (status === 0 ? resolve() : reject(exitError(`${packageName} ${args.join(' ')}`, status))));
    });
}

/**
 * Runs npm and waits for it. npm itself is a .cmd file on Windows, so this is
 * the one place a shell is needed there.
 * @param {string[]} args
 * @param {string} cwd
 */
export function runNpm(args, cwd) {
    const { error, status } = spawnSync('npm', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    if (error) {
        throw error;
    }
    if (status !== 0) {
        throw exitError(`npm ${args.join(' ')} (in ${cwd})`, status);
    }
}
