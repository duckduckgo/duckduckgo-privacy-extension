/**
 * Generates data/surrogates.txt, the list of "surrogate" (stub) scripts in a
 * legacy format used by the extension at runtime.
 */
import fs from 'node:fs';

/** @param {string} surrogatesDir */
export function listSurrogates(surrogatesDir) {
    return fs.readdirSync(surrogatesDir);
}

/**
 * @param {string} surrogatesDir
 * @returns {string} File contents in the legacy format.
 */
export function generateSurrogatesList(surrogatesDir) {
    return listSurrogates(surrogatesDir)
        .map((file) => `domain.com/${file} application/javascript\n\n`)
        .join('');
}

/** @param {import('./config.mjs').BuildConfig} config */
export function writeSurrogatesList({ buildDir }) {
    fs.writeFileSync(`${buildDir}/data/surrogates.txt`, generateSurrogatesList(`${buildDir}/web_accessible_resources/`));
}
