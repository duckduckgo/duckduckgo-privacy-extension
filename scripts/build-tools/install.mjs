/**
 * Installs everything the build and the tests need. This is the Node
 * replacement for the Makefile's `npm` target:
 *
 *   node scripts/build-tools/install.mjs
 *
 * - the npm dependencies, from the lockfile, without running their scripts
 * - the Playwright browsers used by the unit and integration tests
 * - the dependencies of privacy-test-pages, which the integration tests serve
 */
import { ROOT_DIR } from './lib/config.mjs';
import { runNodeBin, runNpm } from './lib/run.mjs';

runNpm(['ci', '--ignore-scripts'], ROOT_DIR);
// --with-deps installs the browsers' system packages with apt, which only Linux needs.
await runNodeBin('@playwright/test', ['install', ...(process.platform === 'linux' ? ['--with-deps'] : []), 'chromium', 'firefox']);
runNpm(['install'], `${ROOT_DIR}/node_modules/privacy-test-pages`);
