/**
 * Removes build output.
 *
 *   node scripts/build-tools/clean.mjs --browser <chrome|firefox|embedded> --type <dev|release>
 *   node scripts/build-tools/clean.mjs --all
 *
 * Like the Makefile's `clean` target this also removes the cached Smarter
 * Encryption domain list, so that the next release build fetches a fresh copy.
 */
import { parseArgs } from 'node:util';
import { BROWSERS, ROOT_DIR, SMARTER_ENCRYPTION_LIST, TYPES, resolveConfig } from './lib/config.mjs';
import { remove } from './lib/fs.mjs';

const USAGE = `Usage: node scripts/build-tools/clean.mjs (--browser <${BROWSERS.join('|')}> --type <${TYPES.join('|')}> | --all)`;

const { values } = parseArgs({
    options: {
        browser: { type: 'string' },
        type: { type: 'string' },
        all: { type: 'boolean', default: false },
    },
});

process.chdir(ROOT_DIR);
remove(SMARTER_ENCRYPTION_LIST);
remove('integration-test/artifacts/attribution.json');

if (values.all) {
    remove('build');
} else if (values.browser && values.type) {
    remove(resolveConfig({ browser: values.browser, type: values.type }).buildDir);
} else {
    console.error(USAGE);
    process.exit(1);
}
