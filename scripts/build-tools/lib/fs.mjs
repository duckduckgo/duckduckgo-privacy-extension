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

/** Directories never treated as build inputs when walking for mtimes. */
function isSkippedDir(name) {
    return name === 'node_modules' || name === '.git';
}

/** True when `child` is strictly inside the directory `parent`. */
export function isWithin(parent, child) {
    const relative = path.relative(parent, child);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
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
 * Files under a directory with the given extension, like a shell glob for
 * `*.ext` in that directory or (recursive) in it and every directory below.
 * Paths keep `dir` as their prefix.
 * @param {string} dir
 * @param {string} extension e.g. '.js'
 * @param {{recursive?: boolean}} [options]
 * @returns {string[]}
 */
export function listFiles(dir, extension, { recursive = false } = {}) {
    return fs
        .readdirSync(dir, { withFileTypes: true, recursive })
        .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
        .sort();
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

/** Timestamp for file names and contents, in the format of the Makefile's `date +"%Y%m%d_%H%M%S"`. */
export function timestamp(now = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** @param {string} p */
export function remove(p) {
    fs.rmSync(p, { recursive: true, force: true });
}
