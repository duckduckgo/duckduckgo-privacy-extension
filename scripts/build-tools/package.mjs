/**
 * Packages a release build for distribution. This is the Node replacement for
 * the Makefile's `chrome-release-zip`, `chrome-beta`, `beta-firefox` and
 * `embedded-release-zip` targets. Run it after a release build.
 *
 *   node scripts/build-tools/package.mjs --browser chrome              build/chrome/release/chrome-release-<timestamp>.zip
 *   node scripts/build-tools/package.mjs --browser chrome --beta       same, as the beta extension (name and icons)
 *   node scripts/build-tools/package.mjs --browser firefox --beta      build/firefox/release/web-ext-artifacts/*.zip (via npx web-ext), without the add-on id
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
import { TARGET_OPTIONS, resolveTarget } from './lib/cli.mjs';
import { BROWSERS, ROOT_DIR } from './lib/config.mjs';
import { copyEntries, listVisible } from './lib/fs.mjs';
import { runNpx } from './lib/run.mjs';

const USAGE = `Usage: node scripts/build-tools/package.mjs --browser <${BROWSERS.join('|')}> [--beta]`;

const FIREFOX_ADDON_ID = 'jid1-ZAdIEUB7XOzOJw@jetpack';

/** Same format as the Makefile's \`date +"%Y%m%d_%H%M%S"\`. */
function timestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Equivalent of `rm -f <prefix>-*.zip; cd <dir> && zip -rq <prefix>-<timestamp>.zip *`:
 * every visible entry of the directory, at the root of the archive.
 * @param {string} dir
 * @param {string} prefix
 */
async function zipDirectory(dir, prefix) {
    for (const name of listVisible(dir)) {
        if (name.startsWith(`${prefix}-`) && name.endsWith('.zip')) {
            fs.rmSync(path.join(dir, name));
        }
    }
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
 * Writes the build's manifest from the browser's source manifest with a
 * line-by-line edit applied, as the Makefile did with sed.
 * @param {string} browser
 * @param {string} buildDir
 * @param {(line: string) => string | null} editLine Returns the replacement line, or null to drop it.
 */
function writeEditedManifest(browser, buildDir, editLine) {
    const lines = fs.readFileSync(`browsers/${browser}/manifest.json`, 'utf8').split('\n');
    const edited = lines.map(editLine).filter((line) => line !== null);
    fs.writeFileSync(`${buildDir}/manifest.json`, edited.join('\n'));
}

const PACKAGERS = {
    async chrome({ out }, beta) {
        if (beta) {
            writeEditedManifest('chrome', out.root, (line) =>
                line.replace('__MSG_appName__', 'DuckDuckGo Search & Tracker Protection Beta'),
            );
            copyEntries(`${out.img}/beta`, out.img);
        }
        await zipDirectory(out.root, 'chrome-release');
    },
    async firefox({ out }, beta) {
        if (!beta) {
            throw new Error('Firefox release builds are packaged by the release workflow with web-ext; use --beta for a beta package.');
        }
        writeEditedManifest('firefox', out.root, (line) => (line.includes(FIREFOX_ADDON_ID) ? null : line));
        runNpx(['web-ext', 'build'], out.root);
    },
    async embedded({ out }) {
        await zipDirectory(out.root, 'embedded-release');
    },
};

const { values } = parseArgs({ options: { ...TARGET_OPTIONS, beta: { type: 'boolean' } } });
const config = resolveTarget({ ...values, type: 'release' }, USAGE);
const packager = PACKAGERS[config.browser];
if (!packager) {
    console.error(`No packaging step for ${config.browser}.\n${USAGE}`);
    process.exit(1);
}
process.chdir(ROOT_DIR);
await packager(config, values.beta);
