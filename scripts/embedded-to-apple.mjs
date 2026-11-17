/**
 * Builds the embedded extension and copies it into a local apple-browsers
 * checkout, for testing local changes in an Apple build. Mirrors the copy
 * steps of .github/workflows/release-embedded.yml, without committing.
 *
 *   npm run embedded-to-apple -- <path to apple-browsers> [--dev]
 *
 * The path defaults to the APPLE_BROWSERS_DIR environment variable.
 *
 * --dev bumps a fourth version component in browsers/embedded/manifest.json
 * before building (2026.11.6 -> 2026.11.6.1 -> 2026.11.6.2 ...), so that every
 * build counts as newer to the app. The bump is left in place so the next run
 * continues from it; revert it before committing, as a manifest change on main
 * triggers a real release to apple-browsers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT_DIR } from './build-tools/lib/config.mjs';
import { listFiles } from './build-tools/lib/fs.mjs';
import { runNpm } from './build-tools/lib/run.mjs';

// Keep in sync with the env block of .github/workflows/release-embedded.yml.
const APPLE_EMBEDDED_PATH = 'SharedPackages/WebExtensions/Sources/WebExtensions/BundledWebExtensions/duckduckgo-embedded-web-extension.zip';
const APPLE_SITE_BUCKETS_PATH = 'SharedPackages/WebExtensions/Sources/WebExtensions/Autoconsent/site-buckets.json';

const { values, positionals } = parseArgs({ options: { dev: { type: 'boolean', default: false } }, allowPositionals: true });
const appleArg = positionals[0] ?? process.env.APPLE_BROWSERS_DIR;
if (!appleArg) {
    console.error('Usage: npm run embedded-to-apple -- <path to apple-browsers> [--dev] (or set APPLE_BROWSERS_DIR)');
    process.exit(1);
}
const appleDir = path.resolve(appleArg);
const zipDest = path.join(appleDir, APPLE_EMBEDDED_PATH);
const siteBucketsDest = path.join(appleDir, APPLE_SITE_BUCKETS_PATH);
for (const dest of [zipDest, siteBucketsDest]) {
    if (!fs.existsSync(path.dirname(dest))) {
        console.error(`${path.dirname(dest)} does not exist. Is ${appleDir} an apple-browsers checkout?`);
        process.exit(1);
    }
}

const manifestPath = path.join(ROOT_DIR, 'browsers/embedded/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (values.dev) {
    const parts = manifest.version.split('.').map(Number);
    if (parts.length === 3) {
        parts.push(1);
    } else if (parts.length === 4) {
        parts[3] += 1;
    } else {
        console.error(`Cannot bump version "${manifest.version}": expected 3 or 4 components.`);
        process.exit(1);
    }
    manifest.version = parts.join('.');
    // Same formatting as scripts/bumpVersion.js.
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
}

runNpm(['run', 'release-embedded'], ROOT_DIR);

// The packager removes older zips, so exactly one is left.
const [zip] = listFiles(path.join(ROOT_DIR, 'build/embedded/release'), '.zip');
fs.copyFileSync(zip, zipDest);
fs.copyFileSync(path.join(ROOT_DIR, 'shared/data/bundled/site-buckets.json'), siteBucketsDest);

console.log(`\nCopied ${path.basename(zip)} (version ${manifest.version}) and site-buckets.json into ${appleDir}`);
if (values.dev) {
    console.log('browsers/embedded/manifest.json now has a dev version; revert it before committing.');
}
