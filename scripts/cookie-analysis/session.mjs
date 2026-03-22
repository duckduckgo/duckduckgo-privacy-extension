/**
 * Interactive Playwright session for cookie notice analysis.
 *
 * Usage: node session.mjs <url> <workdir>
 *
 * Phase 1: Loads URL with DDG extension, captures blocked requests,
 *   takes screenshot, writes accessibility/interactive elements info.
 *   Signals ready by writing workdir/phase1_done.
 *
 * Then polls for workdir/command.json:
 *   {"action":"click","text":"Accept All"}   - click by visible text
 *   {"action":"click","selector":"#btn"}     - click by CSS selector
 *   {"action":"click","x":500,"y":400}       - click by viewport coordinates
 *   {"action":"skip"}                        - skip, no click needed
 *
 * Phase 2: Performs the click, waits, captures new blocked requests,
 *   takes after-screenshot. Writes workdir/phase2_done.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const url = process.argv[2];
const workDir = process.argv[3];
const extensionPath = path.resolve('build/chrome/dev');

const PAGE_LOAD_TIMEOUT = 40000;
const SETTLE_DELAY = 6000;
const POST_CLICK_DELAY = 6000;
const COMMAND_POLL_INTERVAL = 500;
const COMMAND_TIMEOUT = 600000; // 10 min max wait for command

if (!url || !workDir) {
    console.error('Usage: node session.mjs <url> <workdir>');
    process.exit(1);
}

fs.mkdirSync(workDir, { recursive: true });

// Clean up any leftover files from previous runs
for (const f of ['phase1_done', 'phase2_done', 'command.json', 'error.json']) {
    try { fs.unlinkSync(path.join(workDir, f)); } catch { /* ok */ }
}

function writeJSON(filename, data) {
    fs.writeFileSync(path.join(workDir, filename), JSON.stringify(data, null, 2));
}

async function main() {
    let context;
    let page;

    try {
        context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--no-first-run',
                '--disable-popup-blocking',
                '--disable-component-update',
            ],
            viewport: { width: 1280, height: 800 },
            ignoreHTTPSErrors: true,
        });

        // Wait for extension initialization
        await new Promise((r) => setTimeout(r, 3000));

        // Close any extension-opened tabs
        for (const p of context.pages()) {
            if (context.pages().length > 1) {
                const u = p.url();
                if (u.includes('duckduckgo') || u.includes('extension') || u === 'about:blank') {
                    try { await p.close(); } catch { /* ignore */ }
                }
            }
        }

        page = context.pages()[0] || await context.newPage();

        // === PHASE 1: Load and capture ===
        const blockedBefore = [];
        const allDomainsBefore = new Set();
        const allRequestsBefore = [];

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('ERR_BLOCKED_BY_CLIENT')) {
                try {
                    const reqUrl = request.url();
                    const domain = new URL(reqUrl).hostname;
                    blockedBefore.push({ url: reqUrl, domain });
                } catch { /* ignore */ }
            }
        });

        page.on('request', (request) => {
            try {
                const domain = new URL(request.url()).hostname;
                allDomainsBefore.add(domain);
                allRequestsBefore.push({ url: request.url(), domain });
            } catch { /* ignore */ }
        });

        console.log(`Loading ${url}...`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT });
        } catch (e) {
            if (!e.message.includes('Timeout') && !e.message.includes('timeout')) {
                throw e;
            }
            console.log('Page load timed out, continuing...');
        }

        console.log('Waiting for page to settle...');
        await new Promise((r) => setTimeout(r, SETTLE_DELAY));

        // Screenshot
        await page.screenshot({ path: path.join(workDir, 'before.png'), fullPage: false });
        console.log('Screenshot saved.');

        // Save blocked requests
        writeJSON('blocked_before.json', blockedBefore);
        writeJSON('domains_before.json', [...allDomainsBefore]);

        // Get interactive elements with bounding boxes
        const interactiveElements = await page.evaluate(() => {
            const results = [];
            const selectors = 'button, a, [role="button"], input[type="button"], input[type="submit"], [onclick], [class*="close" i], [aria-label]';
            const allEls = document.querySelectorAll(selectors);
            for (const el of allEls) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;
                if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
                if (rect.right < 0 || rect.left > window.innerWidth) continue;

                const text = (el.textContent || '').trim().substring(0, 200);
                const ariaLabel = el.getAttribute('aria-label') || '';
                const title = el.getAttribute('title') || '';
                const role = el.getAttribute('role') || el.tagName.toLowerCase();

                results.push({
                    tag: el.tagName.toLowerCase(),
                    role,
                    text,
                    ariaLabel,
                    title,
                    id: el.id || '',
                    className: (typeof el.className === 'string' ? el.className : '').substring(0, 200),
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                });
            }
            return results;
        });
        writeJSON('interactive_elements.json', interactiveElements);

        // Signal phase 1 done
        fs.writeFileSync(path.join(workDir, 'phase1_done'), 'ok');
        console.log('Phase 1 done. Waiting for command...');

        // === Wait for command ===
        const commandPath = path.join(workDir, 'command.json');
        const startWait = Date.now();
        let command;

        while (Date.now() - startWait < COMMAND_TIMEOUT) {
            try {
                const raw = fs.readFileSync(commandPath, 'utf-8');
                command = JSON.parse(raw);
                break;
            } catch {
                await new Promise((r) => setTimeout(r, COMMAND_POLL_INTERVAL));
            }
        }

        if (!command) {
            writeJSON('error.json', { error: 'Timed out waiting for command' });
            fs.writeFileSync(path.join(workDir, 'phase2_done'), 'timeout');
            await context.close();
            return;
        }

        if (command.action === 'skip') {
            console.log('Skipping (no click needed).');
            writeJSON('result.json', { action: 'skip' });
            fs.writeFileSync(path.join(workDir, 'phase2_done'), 'skipped');
            await context.close();
            return;
        }

        // === PHASE 2: Click and capture ===
        console.log('Performing click action:', JSON.stringify(command));

        // Set up new request tracking (only post-click)
        const blockedAfter = [];
        const newDomains = new Set();

        // Remove old listeners and add new ones specifically for post-click
        page.removeAllListeners('requestfailed');
        page.removeAllListeners('request');

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('ERR_BLOCKED_BY_CLIENT')) {
                try {
                    const reqUrl = request.url();
                    const domain = new URL(reqUrl).hostname;
                    blockedAfter.push({ url: reqUrl, domain });
                    newDomains.add(domain);
                } catch { /* ignore */ }
            }
        });

        page.on('request', (request) => {
            try {
                const domain = new URL(request.url()).hostname;
                newDomains.add(domain);
            } catch { /* ignore */ }
        });

        let clickSuccess = false;
        let clickError = '';

        // Strategy: prefer coordinates (most precise from interactive_elements),
        // then selector, then text-based search.
        const strategies = [];
        if (command.x !== undefined && command.y !== undefined) {
            strategies.push({ type: 'coords', x: command.x, y: command.y });
        }
        if (command.selector) {
            strategies.push({ type: 'selector', selector: command.selector });
        }
        if (command.text) {
            strategies.push({ type: 'role-button', text: command.text });
            strategies.push({ type: 'role-link', text: command.text });
            strategies.push({ type: 'text', text: command.text });
        }
        if (command.fallbackX !== undefined && command.fallbackY !== undefined) {
            strategies.push({ type: 'coords', x: command.fallbackX, y: command.fallbackY });
        }

        for (const strat of strategies) {
            try {
                if (strat.type === 'coords') {
                    console.log(`Trying click at (${strat.x}, ${strat.y})...`);
                    await page.mouse.click(strat.x, strat.y);
                    clickSuccess = true;
                } else if (strat.type === 'selector') {
                    console.log(`Trying click on selector: ${strat.selector}...`);
                    await page.click(strat.selector, { timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'role-button') {
                    console.log(`Trying click on button role with name: "${strat.text}"...`);
                    await page.getByRole('button', { name: strat.text, exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'role-link') {
                    console.log(`Trying click on link role with name: "${strat.text}"...`);
                    await page.getByRole('link', { name: strat.text, exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'text') {
                    console.log(`Trying click on text: "${strat.text}"...`);
                    await page.getByText(strat.text, { exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                }
                if (clickSuccess) {
                    console.log(`Click succeeded with strategy: ${strat.type}`);
                    break;
                }
            } catch (e) {
                console.log(`Strategy ${strat.type} failed: ${e.message}`);
                clickError = e.message;
            }
        }

        if (!clickSuccess && strategies.length === 0) {
            clickError = 'No valid click target in command';
        }

        console.log('Waiting for post-click requests to settle...');
        await new Promise((r) => setTimeout(r, POST_CLICK_DELAY));

        // After screenshot
        await page.screenshot({ path: path.join(workDir, 'after.png'), fullPage: false });

        // Determine which blocked requests are new (not in before set)
        const beforeUrls = new Set(blockedBefore.map((r) => r.url));
        const newBlockedRequests = blockedAfter.filter((r) => !beforeUrls.has(r.url));
        const newBlockedToNewDomains = newBlockedRequests.filter((r) => !allDomainsBefore.has(r.domain));

        writeJSON('blocked_after.json', blockedAfter);
        writeJSON('new_blocked.json', newBlockedRequests);
        writeJSON('new_blocked_new_domains.json', newBlockedToNewDomains);
        writeJSON('domains_after.json', [...newDomains]);
        writeJSON('result.json', {
            action: 'click',
            clickSuccess,
            clickError,
            blockedBeforeCount: blockedBefore.length,
            blockedAfterCount: blockedAfter.length,
            newBlockedCount: newBlockedRequests.length,
            newBlockedNewDomainsCount: newBlockedToNewDomains.length,
        });

        fs.writeFileSync(path.join(workDir, 'phase2_done'), 'ok');
        console.log(`Phase 2 done. ${newBlockedRequests.length} new blocked, ${newBlockedToNewDomains.length} to new domains.`);

        await context.close();
    } catch (e) {
        console.error('Fatal error:', e.message);
        writeJSON('error.json', { error: e.message, stack: e.stack });
        fs.writeFileSync(path.join(workDir, 'phase2_done'), 'error');
        if (context) {
            try { await context.close(); } catch { /* ignore */ }
        }
        process.exit(1);
    }
}

main();
