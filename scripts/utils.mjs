import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'node:crypto';

const etagFilePath = './shared/data/etags.json';

/**
 * Reads the shared/data/etags.json file, and returns the stored etag values. If
 * the file does not yet exist an empty Object is returned.
 * Note: For convenience, all stored etags are returned. But take care to
 *       pull out only relevant etags. That way those etags can be updated later
 *       without overwriting any changes to unrelated etags.
 * @return {Record<string, string>}
 */
export function readEtags() {
    try {
        return JSON.parse(readFileSync(etagFilePath));
    } catch (e) {
        return {};
    }
}

/**
 * Updates the shared/data/etags.json file with the provided etag values.
 * Creates the file if it does not already exist. Ignores non-string values
 * provided and preserves any existing values in the file that weren't updated.
 * Note: It is not safe to use this function concurrently with anything that
 *       might also write to the etags file.
 * @param {Record<string, string|undefined>} newEtags
 */
export function writeEtags(newEtags) {
    const etags = readEtags();
    for (const [key, value] of Object.entries(newEtags)) {
        if (typeof value === 'string') {
            etags[key] = value;
        }
    }
    writeFileSync(etagFilePath, JSON.stringify(etags, null, 2));
}

/**
 * Reads the file and returns a MD5 checksum formatted as a hex string. If the
 * file can't be read, null is returned.
 * @param {string} path
 * @return {string?}
 */
export function md5sum(path) {
    let contents;
    try {
        contents = readFileSync(path);
    } catch (e) {
        return null;
    }

    const hash = createHash('md5');
    hash.update(contents);
    return hash.digest('hex');
}
