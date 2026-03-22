/**
 * Sequential multi-site cookie analysis in a single browser session.
 * Processes sites one at a time, clearing state between sites.
 *
 * Usage: node multi-session.mjs <sites-file> <output-dir> [start-index]
 *
 * For each site:
 * 1. Clears cookies/storage
 * 2. Navigates to URL, captures blocked requests, screenshots, interactive elements
 * 3. Writes <domain>/phase1_done
 * 4. Waits for <domain>/command.json
 * 5. Executes command, captures post-click data
 * 6. Writes <domain>/phase2_done
 */
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const sitesFile = process.argv[2];
const outputDir = process.argv[3];
const startIndex = parseInt(process.argv[4] || '0', 10);
const extensionPath = path.resolve('build/chrome/dev');

const PAGE_LOAD_TIMEOUT = 35000;
const SETTLE_DELAY = 5000;
const POST_CLICK_DELAY = 5000;
const COMMAND_POLL_INTERVAL = 500;
const COMMAND_TIMEOUT = 600000;

function parseSites(filePath) {
    return fs.readFileSync(filePath, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => {
            const parts = l.split('|');
            if (parts.length >= 2) {
                return { domain: parts[0], url: parts[1] };
            }
            return null;
        })
        .filter(Boolean);
}

function writeJSON(dir, filename, data) {
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
}

async function processSite(context, site, outputDir) {
    const siteDir = path.join(outputDir, site.domain.replace(/[^a-zA-Z0-9._-]/g, '_'));
    fs.mkdirSync(siteDir, { recursive: true });

    for (const f of ['phase1_done', 'phase2_done', 'command.json', 'error.json']) {
        try { fs.unlinkSync(path.join(siteDir, f)); } catch { /* ok */ }
    }

    let page;
    try {
        // Clear all state
        await context.clearCookies();

        page = await context.newPage();

        const blockedBefore = [];
        const allDomainsBefore = new Set();

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
            } catch { /* ignore */ }
        });

        console.log(`  Loading ${site.url}...`);
        try {
            await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT });
        } catch (e) {
            if (!e.message.includes('Timeout') && !e.message.includes('timeout') && !e.message.includes('ERR_')) {
                throw e;
            }
            console.log('  Page load issue, continuing...');
        }

        await new Promise((r) => setTimeout(r, SETTLE_DELAY));

        try {
            await page.screenshot({ path: path.join(siteDir, 'before.png'), fullPage: false, timeout: 15000 });
        } catch {
            try {
                await page.screenshot({ path: path.join(siteDir, 'before.png'), fullPage: false, timeout: 15000, animations: 'disabled' });
            } catch (e2) {
                console.log(`  Screenshot failed: ${e2.message}`);
            }
        }

        writeJSON(siteDir, 'blocked_before.json', blockedBefore);
        writeJSON(siteDir, 'domains_before.json', [...allDomainsBefore]);

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

                results.push({
                    tag: el.tagName.toLowerCase(),
                    role: el.getAttribute('role') || el.tagName.toLowerCase(),
                    text: (el.textContent || '').trim().substring(0, 200),
                    ariaLabel: el.getAttribute('aria-label') || '',
                    title: el.getAttribute('title') || '',
                    id: el.id || '',
                    className: (typeof el.className === 'string' ? el.className : '').substring(0, 200),
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
                });
            }
            return results;
        }).catch(() => []);
        writeJSON(siteDir, 'interactive_elements.json', interactiveElements);

        fs.writeFileSync(path.join(siteDir, 'phase1_done'), 'ok');
        console.log(`  Phase 1 done. Waiting for command...`);

        // Wait for command
        const commandPath = path.join(siteDir, 'command.json');
        const startWait = Date.now();
        let command;
        while (Date.now() - startWait < COMMAND_TIMEOUT) {
            try {
                command = JSON.parse(fs.readFileSync(commandPath, 'utf-8'));
                break;
            } catch {
                await new Promise((r) => setTimeout(r, COMMAND_POLL_INTERVAL));
            }
        }

        if (!command) {
            writeJSON(siteDir, 'error.json', { error: 'Timed out waiting for command' });
            fs.writeFileSync(path.join(siteDir, 'phase2_done'), 'timeout');
            await page.close();
            return;
        }

        if (command.action === 'skip') {
            console.log('  Skipping.');
            writeJSON(siteDir, 'result.json', { action: 'skip', reason: command.reason || '' });
            fs.writeFileSync(path.join(siteDir, 'phase2_done'), 'skipped');
            await page.close();
            return;
        }

        // Phase 2: Click
        console.log(`  Clicking: ${JSON.stringify(command)}`);

        const blockedAfter = [];
        page.removeAllListeners('requestfailed');
        page.removeAllListeners('request');

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('ERR_BLOCKED_BY_CLIENT')) {
                try {
                    blockedAfter.push({ url: request.url(), domain: new URL(request.url()).hostname });
                } catch { /* ignore */ }
            }
        });

        const newDomainsAfter = new Set();
        page.on('request', (request) => {
            try { newDomainsAfter.add(new URL(request.url()).hostname); } catch { /* ignore */ }
        });

        let clickSuccess = false;
        let clickError = '';

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
        if (command.fallbackX !== undefined) {
            strategies.push({ type: 'coords', x: command.fallbackX, y: command.fallbackY });
        }

        for (const strat of strategies) {
            try {
                if (strat.type === 'coords') {
                    await page.mouse.click(strat.x, strat.y);
                    clickSuccess = true;
                } else if (strat.type === 'selector') {
                    await page.click(strat.selector, { timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'role-button') {
                    await page.getByRole('button', { name: strat.text, exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'role-link') {
                    await page.getByRole('link', { name: strat.text, exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                } else if (strat.type === 'text') {
                    await page.getByText(strat.text, { exact: false }).first().click({ timeout: 5000 });
                    clickSuccess = true;
                }
                if (clickSuccess) break;
            } catch (e) {
                clickError = e.message;
            }
        }

        await new Promise((r) => setTimeout(r, POST_CLICK_DELAY));

        try {
            await page.screenshot({ path: path.join(siteDir, 'after.png'), fullPage: false, timeout: 15000 });
        } catch {
            try {
                await page.screenshot({ path: path.join(siteDir, 'after.png'), fullPage: false, timeout: 15000, animations: 'disabled' });
            } catch { /* ignore */ }
        }

        const beforeUrls = new Set(blockedBefore.map((r) => r.url));
        const newBlocked = blockedAfter.filter((r) => !beforeUrls.has(r.url));
        const newBlockedNewDomains = newBlocked.filter((r) => !allDomainsBefore.has(r.domain));

        writeJSON(siteDir, 'blocked_after.json', blockedAfter);
        writeJSON(siteDir, 'new_blocked.json', newBlocked);
        writeJSON(siteDir, 'new_blocked_new_domains.json', newBlockedNewDomains);
        writeJSON(siteDir, 'result.json', {
            action: 'click',
            clickSuccess,
            clickError: clickSuccess ? '' : clickError,
            blockedBeforeCount: blockedBefore.length,
            blockedAfterCount: blockedAfter.length,
            newBlockedCount: newBlocked.length,
            newBlockedNewDomainsCount: newBlockedNewDomains.length,
        });

        fs.writeFileSync(path.join(siteDir, 'phase2_done'), 'ok');
        console.log(`  Phase 2 done. ${newBlocked.length} new blocked, ${newBlockedNewDomains.length} to new domains.`);

        await page.close();
    } catch (e) {
        console.error(`  Error: ${e.message}`);
        writeJSON(siteDir, 'error.json', { error: e.message });
        writeJSON(siteDir, 'result.json', { action: 'error', error: e.message });
        fs.writeFileSync(path.join(siteDir, 'phase2_done'), 'error');
        if (page) {
            try { await page.close(); } catch { /* ignore */ }
        }
    }
}

async function main() {
    const sites = parseSites(sitesFile);
    console.log(`Found ${sites.length} sites. Starting from index ${startIndex}.`);

    fs.mkdirSync(outputDir, { recursive: true });

    const context = await chromium.launchPersistentContext('', {
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

    // Wait for extension init
    await new Promise((r) => setTimeout(r, 3000));

    // Close extension tabs
    for (const p of context.pages()) {
        if (context.pages().length > 1) {
            const u = p.url();
            if (u.includes('duckduckgo') || u.includes('extension') || u === 'about:blank') {
                try { await p.close(); } catch { /* ignore */ }
            }
        }
    }

    for (let i = startIndex; i < sites.length; i++) {
        console.log(`\n[${i + 1}/${sites.length}] ${sites[i].domain}`);
        await processSite(context, sites[i], outputDir);
    }

    console.log('\nAll sites processed.');
    await context.close();
}

main().catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
});
