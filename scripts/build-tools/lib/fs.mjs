/**
 * Small filesystem helpers used across the build scripts. Everything here is
 * Node core, so it behaves the same on Linux, macOS and Windows.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Files rsync was told to skip in the Makefile (editor backup files). */
function isExcluded(filePath) {
    return path.basename(filePath).endsWith('~');
}

/** @param {string} dir */
export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

/**
 * Equivalent of `rsync -ra --exclude="*~" src dest`, where src is a file or a
 * directory: a directory is copied *as* `dest` (merging into it if it already
 * exists), a file is copied *to* `dest`.
 * @param {string} src
 * @param {string} dest
 */
export function copy(src, dest) {
    fs.cpSync(src, dest, {
        recursive: true,
        dereference: true,
        filter: (source) => !isExcluded(source),
    });
}

/**
 * Equivalent of `rsync -ra --exclude="*~" src/* dest/`: copies each visible
 * entry of the directory into dest. Like a shell glob, dotfiles are skipped.
 * @param {string} srcDir
 * @param {string} destDir
 * @param {(name: string) => boolean} [match] Optional filter on entry names.
 */
export function copyEntries(srcDir, destDir, match = () => true) {
    ensureDir(destDir);
    for (const name of fs.readdirSync(srcDir)) {
        if (name.startsWith('.') || !match(name)) {
            continue;
        }
        copy(path.join(srcDir, name), path.join(destDir, name));
    }
}

/**
 * Writes the file only when its contents differ. Keeps mtimes stable, which
 * matters for files under watched source directories such as the generated
 * locale-resources.js.
 * @param {string} filePath
 * @param {string|Buffer} contents
 * @returns {boolean} true if the file was written.
 */
export function writeIfChanged(filePath, contents) {
    try {
        const existing = fs.readFileSync(filePath);
        if (Buffer.isBuffer(contents) ? existing.equals(contents) : existing.toString('utf8') === contents) {
            return false;
        }
    } catch (e) {
        // File does not exist yet.
    }
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, contents);
    return true;
}

/** @param {string} filePath */
export function exists(filePath) {
    return fs.existsSync(filePath);
}

/**
 * Newest modification time (ms) of the given paths, descending into
 * directories. Missing paths are ignored.
 * @param {string[]} paths
 * @returns {number}
 */
export function newestMtime(paths) {
    let newest = 0;
    const visit = (p) => {
        let stat;
        try {
            stat = fs.statSync(p);
        } catch (e) {
            return;
        }
        if (stat.isDirectory()) {
            for (const name of fs.readdirSync(p)) {
                if (name === 'node_modules' || name === '.git') continue;
                visit(path.join(p, name));
            }
        } else if (stat.mtimeMs > newest) {
            newest = stat.mtimeMs;
        }
    };
    paths.forEach(visit);
    return newest;
}

/**
 * True when `output` is missing or older than any of `inputs`. This is the
 * one piece of Make-style dependency tracking the build keeps, used only for
 * steps that are slow (rebuilding a linked content-scope-scripts checkout).
 * @param {string} output
 * @param {string[]} inputs
 */
export function isStale(output, inputs) {
    let outputStat;
    try {
        outputStat = fs.statSync(output);
    } catch (e) {
        return true;
    }
    return newestMtime(inputs) > outputStat.mtimeMs;
}

/** @param {string} p */
export function remove(p) {
    fs.rmSync(p, { recursive: true, force: true });
}
