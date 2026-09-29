/**
 * Small filesystem helpers used across the build scripts. Everything here is
 * Node core, so it behaves the same on Linux, macOS and Windows.
 */
import fs from 'node:fs';
import path from 'node:path';

/** Editor backup files, which rsync was told to skip in the Makefile. */
export function isBackupFile(filePath) {
    return filePath.endsWith('~');
}

/** Directories never treated as build inputs. */
export function isSkippedDir(name) {
    return name === 'node_modules' || name === '.git';
}

/** @param {string} dir */
export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

/** Directory entries, skipping dotfiles like a shell glob does. */
export function listVisible(dir) {
    return fs.readdirSync(dir).filter((name) => !name.startsWith('.'));
}

/**
 * Equivalent of `rsync -ra --exclude="*~" src dest`, where src is a file or a
 * directory: a directory is copied *as* `dest` (merging into it if it already
 * exists), a file is copied *to* `dest`.
 * @param {string} src
 * @param {string} dest
 * @param {(source: string) => boolean} [include] Optional extra filter on source paths.
 */
export function copy(src, dest, include = () => true) {
    fs.cpSync(src, dest, {
        recursive: true,
        dereference: true,
        filter: (source) => !isBackupFile(source) && include(source),
    });
}

/**
 * Equivalent of `rsync -ra --exclude="*~" src/* dest/`: copies each visible
 * entry of the directory into dest.
 * @param {string} srcDir
 * @param {string} destDir
 * @param {(name: string) => boolean} [match] Optional filter on entry names.
 */
export function copyEntries(srcDir, destDir, match = () => true) {
    ensureDir(destDir);
    for (const name of listVisible(srcDir).filter(match)) {
        copy(path.join(srcDir, name), path.join(destDir, name));
    }
}

/**
 * Writes the file only when its contents differ, so its mtime stays stable.
 * @param {string} filePath
 * @param {string} contents
 */
export function writeIfChanged(filePath, contents) {
    try {
        if (fs.readFileSync(filePath, 'utf8') === contents) {
            return;
        }
    } catch (e) {
        // File does not exist yet.
    }
    fs.writeFileSync(filePath, contents);
}

/** Same as `touch`: bump the mtime of an existing path. */
export function touch(p) {
    const now = new Date();
    fs.utimesSync(p, now, now);
}

/**
 * Downloads a URL to a file unless the file already exists. Used for inputs
 * that should be fetched once per checkout (fonts) or once per release build
 * (the Smarter Encryption list, which `clean` removes).
 * @param {string} url
 * @param {string} dest
 * @param {(body: Buffer) => Buffer} [transform]
 */
export async function fetchCached(url, dest, transform = (body) => body) {
    if (fs.existsSync(dest)) {
        return;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
    }
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, transform(Buffer.from(await response.arrayBuffer())));
}

/**
 * Newest modification time (ms) under the given paths. Missing paths are
 * ignored, as are node_modules and .git directories.
 * @param {string[]} paths
 */
function newestMtime(paths) {
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
                if (!isSkippedDir(name)) visit(path.join(p, name));
            }
        } else if (stat.mtimeMs > newest) {
            newest = stat.mtimeMs;
        }
    };
    paths.forEach(visit);
    return newest;
}

/**
 * True when `output` is missing or older than anything under `inputs`. This
 * is the one piece of Make-style dependency tracking the build keeps, for the
 * few steps that are slow or that read a cached download.
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
