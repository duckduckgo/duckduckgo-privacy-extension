/**
 * Removes build output.
 *
 *   node scripts/build-tools/clean.mjs --browser <chrome|firefox|embedded|chromium-embedded> --type <dev|release>
 *   node scripts/build-tools/clean.mjs --all
 *
 * Like the Makefile's `clean` target this also removes the cached Smarter
 * Encryption domain list, so that the next release build fetches a fresh copy,
 * and an artifact left behind by the integration tests.
 */
import { parseArgs } from 'node:util';
import { TARGET_OPTIONS, TARGET_USAGE, resolveTarget } from './lib/cli.mjs';
import { BUILD_ROOT, ROOT_DIR, SMARTER_ENCRYPTION_LIST } from './lib/config.mjs';
import { remove } from './lib/fs.mjs';

const USAGE = `Usage: node scripts/build-tools/clean.mjs (${TARGET_USAGE} | --all)`;

const { values } = parseArgs({ options: { ...TARGET_OPTIONS, all: { type: 'boolean' } } });
const target = values.all ? BUILD_ROOT : resolveTarget(values, USAGE).out.root;

process.chdir(ROOT_DIR);
remove(target);
remove(SMARTER_ENCRYPTION_LIST);
remove('integration-test/artifacts/attribution.json');
