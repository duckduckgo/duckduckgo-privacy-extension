/**
 * Generates data/surrogates.txt, the list of "surrogate" (stub) scripts in a
 * legacy format used by the extension at runtime.
 */
import fs from 'node:fs';

/**
 * @param {string} surrogatesDir
 * @returns {string} File contents in the legacy format.
 */
export function generateSurrogatesList(surrogatesDir) {
    return fs
        .readdirSync(surrogatesDir)
        .map((file) => `domain.com/${file} application/javascript\n\n`)
        .join('');
}

/** @param {import('./config.mjs').BuildConfig} config */
export function writeSurrogatesList({ out }) {
    fs.writeFileSync(`${out.data}/surrogates.txt`, generateSurrogatesList(out.surrogates));
}
