/**
 * Removes build output.
 *
 *   node scripts/build-tools/clean.mjs --browser <chrome|firefox|embedded|chromium-embedded> --type <dev|release>
 *   node scripts/build-tools/clean.mjs --all
 */
import { parseArgs } from 'node:util';
import { clean } from './lib/clean.mjs';
import { TARGET_OPTIONS, TARGET_USAGE, resolveTarget } from './lib/cli.mjs';
import { BUILD_ROOT, ROOT_DIR } from './lib/config.mjs';

const USAGE = `Usage: node scripts/build-tools/clean.mjs (${TARGET_USAGE} | --all)`;

const { values } = parseArgs({ options: { ...TARGET_OPTIONS, all: { type: 'boolean' } } });
const target = values.all ? BUILD_ROOT : resolveTarget(values, USAGE).out.root;

process.chdir(ROOT_DIR);
clean(target);
