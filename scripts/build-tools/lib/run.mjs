/**
 * Helpers for running other tools. Node based tools are run by resolving their
 * bin script and executing it with the current Node binary, which needs no
 * shell and so behaves identically on Windows (where node_modules/.bin holds
 * .cmd shims rather than executables).
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

function checkExit(label, { error, status }) {
    if (error) {
        throw error;
    }
    if (status !== 0) {
        throw new Error(`${label} exited with status ${status}`);
    }
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
        child.on('exit', (status) => {
            try {
                checkExit(`${packageName} ${args.join(' ')}`, { status });
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * Runs npm and waits for it. npm itself is a .cmd file on Windows, so this is
 * the one place a shell is needed there.
 * @param {string[]} args
 * @param {string} cwd
 */
export function runNpm(args, cwd) {
    checkExit(`npm ${args.join(' ')} (in ${cwd})`, spawnSync('npm', args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' }));
}
