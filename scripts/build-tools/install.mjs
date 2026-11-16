/**
 * Installs everything the build and the tests need:
 *
 *   node scripts/build-tools/install.mjs
 *
 * - the npm dependencies, from the lockfile, without running their scripts
 * - the Playwright browsers used by the unit and integration tests
 * - the content-scope-scripts test pages that privacy-test-pages serves
 */
import fs from 'node:fs';
import path from 'node:path';

import { ROOT_DIR } from './lib/config.mjs';
import { runNodeBin, runNpm } from './lib/run.mjs';

runNpm(['ci', '--ignore-scripts'], ROOT_DIR);
// --with-deps installs the browsers' system packages with apt, which only Linux needs.
await runNodeBin('@playwright/test', ['install', ...(process.platform === 'linux' ? ['--with-deps'] : []), 'chromium', 'firefox']);

// The privacy-test-pages server serves the content-scope-scripts test pages from
// its own node_modules folder (a path relative to it, not a module lookup), but
// npm installs content-scope-scripts only once, at the root. Link our copy into
// the place the server looks. This replaces a separate `npm install` inside
// privacy-test-pages, which took over ten minutes on Windows. A junction needs
// no special permissions on Windows; other platforms ignore the type.
const cssLink = path.join(ROOT_DIR, 'node_modules', 'privacy-test-pages', 'node_modules', '@duckduckgo', 'content-scope-scripts');
fs.rmSync(cssLink, { recursive: true, force: true });
fs.mkdirSync(path.dirname(cssLink), { recursive: true });
fs.symlinkSync(path.join(ROOT_DIR, 'node_modules', '@duckduckgo', 'content-scope-scripts'), cssLink, 'junction');
