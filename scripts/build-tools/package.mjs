/**
 * Packages a release build for distribution. This is the Node replacement for
 * the Makefile's `chrome-release-zip`, `chrome-beta`, `beta-firefox` and
 * `embedded-release-zip` targets. Run it after a release build.
 *
 *   node scripts/build-tools/package.mjs --browser chrome              build/chrome/release/chrome-release-<timestamp>.zip
 *   node scripts/build-tools/package.mjs --browser chrome --beta       same, as the beta extension (name and icons)
 *   node scripts/build-tools/package.mjs --browser firefox --beta      build/firefox/release/web-ext-artifacts/*.zip (via npm exec web-ext), without the add-on id
 *   node scripts/build-tools/package.mjs --browser embedded            build/embedded/release/embedded-release-<timestamp>.zip
 *
 * Firefox release builds are packaged by the release workflow itself, with
 * web-ext, so there is no non-beta firefox packaging here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import { ZipArchive } from 'archiver';
import { usageError } from './lib/cli.mjs';
import { BROWSERS_DIR, ROOT_DIR, resolveConfig } from './lib/config.mjs';
import { copyEntries, listFiles, listVisible, remove, timestamp } from './lib/fs.mjs';
import { runNpm } from './lib/run.mjs';

const FIREFOX_ADDON_ID = 'jid1-ZAdIEUB7XOzOJw@jetpack';

/**
 * Equivalent of `rm -f <prefix>-*.zip; cd <dir> && zip -rq <prefix>-<timestamp>.zip *`:
 * every visible entry of the directory, at the root of the archive.
 * @param {string} dir
 * @param {string} prefix
 */
async function zipDirectory(dir, prefix) {
    listFiles(dir, '.zip')
        .filter((file) => path.basename(file).startsWith(`${prefix}-`))
        .forEach(remove);
    const zipPath = path.join(dir, `${prefix}-${timestamp()}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive();
    archive.on('error', (e) => output.destroy(e));
    archive.pipe(output);
    for (const name of listVisible(dir)) {
        const entry = path.join(dir, name);
        if (fs.statSync(entry).isDirectory()) {
            // zip -r writes an entry for the directory itself; directory() only adds its contents.
            archive.append(null, { name: `${name}/` });
            archive.directory(entry, name);
        } else {
            archive.file(entry, { name });
        }
    }
    await archive.finalize();
    await finished(output);
    console.log(`Packaged ${zipPath}`);
}

/**
 * Writes the build's manifest from the browser's source manifest with an edit
 * applied to its text, as the Makefile did with sed.
 * @param {string} browser
 * @param {string} buildDir
 * @param {(text: string) => string} edit
 */
function writeEditedManifest(browser, buildDir, edit) {
    fs.writeFileSync(`${buildDir}/manifest.json`, edit(fs.readFileSync(`${BROWSERS_DIR}/${browser}/manifest.json`, 'utf8')));
}

const lines = (text) => text.split('\n');

const PACKAGERS = {
    async chrome({ out }, beta) {
        if (beta) {
            // sed 's/__MSG_appName__/.../': the first occurrence on each line.
            writeEditedManifest('chrome', out.root, (text) =>
                lines(text)
                    .map((line) => line.replace('__MSG_appName__', 'DuckDuckGo Search & Tracker Protection Beta'))
                    .join('\n'),
            );
            copyEntries(`${out.img}/beta`, out.img);
        }
        await zipDirectory(out.root, 'chrome-release');
    },
    async firefox({ out }, beta) {
        if (!beta) {
            throw new Error('Firefox release builds are packaged by the release workflow with web-ext; use --beta for a beta package.');
        }
        // sed '/<id>/d': drop every line mentioning the add-on id.
        writeEditedManifest('firefox', out.root, (text) =>
            lines(text)
                .filter((line) => !line.includes(FIREFOX_ADDON_ID))
                .join('\n'),
        );
        runNpm(['exec', '--yes', '--', 'web-ext', 'build'], out.root);
    },
    async embedded({ out }) {
        await zipDirectory(out.root, 'embedded-release');
    },
};

const USAGE = `Usage: node scripts/build-tools/package.mjs --browser <${Object.keys(PACKAGERS).join('|')}> [--beta]`;

const { values } = parseArgs({ options: { browser: { type: 'string' }, beta: { type: 'boolean' } } });
const packager = PACKAGERS[values.browser ?? ''] ?? usageError(USAGE);
process.chdir(ROOT_DIR);
await packager(resolveConfig({ browser: values.browser, type: 'release' }), values.beta);
