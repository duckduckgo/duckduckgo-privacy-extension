#!/usr/bin/env node

/**
 * Script to run a Playwright test file repeatedly for flakiness testing.
 *
 * Usage:
 *   node scripts/playwright-repeat.mjs <browser> <test-file> <repeat-count>
 *
 * Examples:
 *   node scripts/playwright-repeat.mjs chrome integration-test/example.spec.js 100
 *   node scripts/playwright-repeat.mjs chrome-mv2 integration-test/example.spec.js 50
 *
 * This is typically invoked via npm scripts:
 *   npm run playwright-repeat -- integration-test/example.spec.js 100
 *   npm run playwright-mv2-repeat -- integration-test/example.spec.js 100
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

const args = process.argv.slice(2);

function printUsage() {
    console.log(`
Usage: node scripts/playwright-repeat.mjs <browser> <test-file> <repeat-count>

Arguments:
  browser       Browser type: 'chrome' (MV3) or 'chrome-mv2' (MV2)
  test-file     Path to the test file (e.g., integration-test/example.spec.js)
  repeat-count  Number of times to repeat each test (positive integer)

Examples:
  node scripts/playwright-repeat.mjs chrome integration-test/click-to-load.spec.js 100
  node scripts/playwright-repeat.mjs chrome-mv2 integration-test/click-to-load.spec.js 50

Via npm scripts:
  npm run playwright-repeat -- integration-test/click-to-load.spec.js 100
  npm run playwright-mv2-repeat -- integration-test/click-to-load.spec.js 100

Purpose:
  This command runs a specific test file multiple times to check for flakiness.
  If a test passes consistently across many runs, it's likely not flaky.
`);
}

if (args.length < 3) {
    console.error('Error: Missing required arguments.\n');
    printUsage();
    process.exit(1);
}

const [browser, testFile, repeatCountStr] = args;

// Validate browser
const validBrowsers = ['chrome', 'chrome-mv2'];
if (!validBrowsers.includes(browser)) {
    console.error(`Error: Invalid browser '${browser}'. Must be one of: ${validBrowsers.join(', ')}\n`);
    printUsage();
    process.exit(1);
}

// Validate test file exists
if (!existsSync(testFile)) {
    console.error(`Error: Test file not found: ${testFile}\n`);
    process.exit(1);
}

// Validate repeat count
const repeatCount = parseInt(repeatCountStr, 10);
if (isNaN(repeatCount) || repeatCount < 1) {
    console.error(`Error: Invalid repeat count '${repeatCountStr}'. Must be a positive integer.\n`);
    printUsage();
    process.exit(1);
}

/**
 * Run a command and return a promise that resolves when the command completes.
 */
function runCommand(command, cmdArgs, options = {}) {
    return new Promise((resolve, reject) => {
        console.log(`\n> ${command} ${cmdArgs.join(' ')}\n`);
        const proc = spawn(command, cmdArgs, {
            stdio: 'inherit',
            shell: true,
            ...options,
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });

        proc.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log(`\n=== Playwright Repeat Test ===`);
    console.log(`Browser: ${browser}`);
    console.log(`Test file: ${testFile}`);
    console.log(`Repeat count: ${repeatCount}`);
    console.log(`==============================\n`);

    // Step 1: Build the extension
    console.log('Step 1: Building extension...\n');
    try {
        await runCommand('make', ['dev', `browser=${browser}`, 'type=dev']);
    } catch (err) {
        console.error('Failed to build extension:', err.message);
        process.exit(1);
    }

    // Step 2: Run Playwright tests with --repeat-each
    console.log(`\nStep 2: Running tests ${repeatCount} times...\n`);

    // Set up environment variables
    const env = { ...process.env };

    // For MV3 (chrome), enable service worker network events
    if (browser === 'chrome') {
        env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
    }

    try {
        await runCommand('npx', ['playwright', 'test', testFile, `--repeat-each=${repeatCount}`], { env });
        console.log(`\n✓ All ${repeatCount} runs passed! The test appears to be stable.`);
    } catch (err) {
        console.error(`\n✗ Test failed during repeated runs. The test may be flaky.`);
        process.exit(1);
    }
}

main();
