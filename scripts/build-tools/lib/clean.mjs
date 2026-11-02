/**
 * Removes build output. Like the Makefile's `clean` target this also removes
 * the cached Smarter Encryption domain list, so that the next release build
 * fetches a fresh copy, and an artifact left behind by the integration tests.
 */
import { SMARTER_ENCRYPTION_LIST } from './config.mjs';
import { remove } from './fs.mjs';

/** @param {string} dir The build directory to remove, or the whole build root. */
export function clean(dir) {
    remove(dir);
    remove(SMARTER_ENCRYPTION_LIST);
    remove('integration-test/artifacts/attribution.json');
}
