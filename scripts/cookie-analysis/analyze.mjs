import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');
const EXTENSION_PATH = path.join(PROJECT_ROOT, 'build', 'chrome', 'dev');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'scripts', 'cookie-analysis', 'output');
const SITES_FILE = path.join(PROJECT_ROOT, 'uploads', 'sites.txt');

const PAGE_LOAD_TIMEOUT = 30000;
const SETTLE_DELAY = 5000;
const POST_CLICK_DELAY = 5000;

function parseSites(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
            const parts = line.split('|');
            if (parts.length >= 3) {
                return { domain: parts[1], url: parts[2] };
            }
            return null;
        })
        .filter(Boolean);
}

async function analyzeSite(context, site, outputDir) {
    const result = {
        domain: site.domain,
        url: site.url,
        status: 'pending',
        blockedRequestsBefore: [],
        blockedRequestsAfter: [],
        newBlockedRequests: [],
        newBlockedDomains: [],
        domainsBefore: new Set(),
        domainsAfter: new Set(),
        cookiePopupFound: false,
        rejectButtonFound: false,
        dismissButtonFound: false,
        dismissButtonText: '',
        disqualified: false,
        disqualifyReason: '',
        screenshotBefore: '',
        screenshotAfter: '',
        domSnapshotFile: '',
        error: null,
    };

    const siteDir = path.join(outputDir, site.domain.replace(/[^a-zA-Z0-9._-]/g, '_'));
    fs.mkdirSync(siteDir, { recursive: true });

    let page;
    try {
        page = await context.newPage();

        const allRequestsBefore = [];
        const blockedBefore = [];
        const requestedDomains = new Set();

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('ERR_BLOCKED_BY_CLIENT')) {
                const url = request.url();
                try {
                    const domain = new URL(url).hostname;
                    blockedBefore.push({ url, domain });
                    requestedDomains.add(domain);
                } catch {
                    blockedBefore.push({ url, domain: 'unknown' });
                }
            }
        });

        page.on('request', (request) => {
            try {
                const domain = new URL(request.url()).hostname;
                requestedDomains.add(domain);
                allRequestsBefore.push({ url: request.url(), domain });
            } catch { /* ignore */ }
        });

        console.log(`  Loading ${site.url}...`);
        try {
            await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT });
        } catch (e) {
            if (e.message.includes('timeout') || e.message.includes('Timeout')) {
                console.log(`  Page load timed out, continuing with partial load...`);
            } else {
                throw e;
            }
        }

        console.log(`  Waiting for page to settle...`);
        await page.waitForTimeout(SETTLE_DELAY);

        result.blockedRequestsBefore = blockedBefore.map((r) => ({ url: r.url, domain: r.domain }));
        result.domainsBefore = new Set(requestedDomains);

        const screenshotBeforePath = path.join(siteDir, 'before.png');
        await page.screenshot({ path: screenshotBeforePath, fullPage: false });
        result.screenshotBefore = path.relative(outputDir, screenshotBeforePath);

        let domSnapshot;
        try {
            domSnapshot = await page.accessibility.snapshot({ interestingOnly: false });
        } catch {
            domSnapshot = { error: 'Could not capture accessibility snapshot' };
        }

        let htmlSnapshot;
        try {
            htmlSnapshot = await page.content();
        } catch {
            htmlSnapshot = '<html><body>Could not capture HTML</body></html>';
        }

        const domSnapshotPath = path.join(siteDir, 'dom_snapshot.json');
        fs.writeFileSync(domSnapshotPath, JSON.stringify({ accessibility: domSnapshot }, null, 2));
        result.domSnapshotFile = path.relative(outputDir, domSnapshotPath);

        const htmlSnapshotPath = path.join(siteDir, 'page.html');
        fs.writeFileSync(htmlSnapshotPath, htmlSnapshot);

        console.log(`  Analyzing cookie popup...`);
        const analysis = await analyzeCookiePopup(page);
        result.cookiePopupFound = analysis.popupFound;
        result.rejectButtonFound = analysis.rejectButtonFound;
        result.dismissButtonFound = analysis.dismissButtonFound;
        result.dismissButtonText = analysis.dismissButtonText;
        result.dismissButtonSelector = analysis.dismissButtonSelector;

        if (!analysis.popupFound) {
            result.disqualified = true;
            result.disqualifyReason = 'No cookie popup found';
            result.status = 'disqualified';
            console.log(`  DISQUALIFIED: No cookie popup found`);
            await page.close();
            return result;
        }

        if (analysis.rejectButtonFound) {
            result.disqualified = true;
            result.disqualifyReason = `Reject/opt-out button found: "${analysis.rejectButtonText}"`;
            result.status = 'disqualified';
            console.log(`  DISQUALIFIED: Reject button found: "${analysis.rejectButtonText}"`);
            await page.close();
            return result;
        }

        if (!analysis.dismissButtonFound) {
            result.disqualified = true;
            result.disqualifyReason = 'Cookie popup found but no dismiss button identified';
            result.status = 'disqualified';
            console.log(`  DISQUALIFIED: No dismiss button found`);
            await page.close();
            return result;
        }

        console.log(`  Found dismiss button: "${analysis.dismissButtonText}"`);
        console.log(`  Clicking dismiss button...`);

        const blockedAfter = [];
        const domainsAfterClick = new Set(requestedDomains);

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            if (failure && failure.errorText.includes('ERR_BLOCKED_BY_CLIENT')) {
                const url = request.url();
                try {
                    const domain = new URL(url).hostname;
                    blockedAfter.push({ url, domain });
                    domainsAfterClick.add(domain);
                } catch {
                    blockedAfter.push({ url, domain: 'unknown' });
                }
            }
        });

        page.on('request', (request) => {
            try {
                const domain = new URL(request.url()).hostname;
                domainsAfterClick.add(domain);
            } catch { /* ignore */ }
        });

        try {
            await clickDismissButton(page, analysis);
        } catch (e) {
            console.log(`  Error clicking dismiss button: ${e.message}`);
            result.error = `Click failed: ${e.message}`;
        }

        console.log(`  Waiting for post-click requests to settle...`);
        await page.waitForTimeout(POST_CLICK_DELAY);

        const screenshotAfterPath = path.join(siteDir, 'after.png');
        await page.screenshot({ path: screenshotAfterPath, fullPage: false });
        result.screenshotAfter = path.relative(outputDir, screenshotAfterPath);

        result.blockedRequestsAfter = blockedAfter.map((r) => ({ url: r.url, domain: r.domain }));

        const beforeUrls = new Set(blockedBefore.map((r) => r.url));
        result.newBlockedRequests = blockedAfter
            .filter((r) => !beforeUrls.has(r.url))
            .map((r) => ({ url: r.url, domain: r.domain }));

        result.newBlockedDomains = result.newBlockedRequests
            .filter((r) => !result.domainsBefore.has(r.domain))
            .map((r) => ({ url: r.url, domain: r.domain }));

        result.domainsAfter = domainsAfterClick;
        result.status = 'analyzed';
        console.log(`  Done. ${result.newBlockedRequests.length} new blocked requests, ${result.newBlockedDomains.length} to new domains.`);
    } catch (e) {
        result.status = 'error';
        result.error = e.message;
        console.log(`  ERROR: ${e.message}`);
    } finally {
        if (page) {
            try { await page.close(); } catch { /* ignore */ }
        }
    }

    return result;
}

async function analyzeCookiePopup(page) {
    return page.evaluate(() => {
        const result = {
            popupFound: false,
            rejectButtonFound: false,
            rejectButtonText: '',
            dismissButtonFound: false,
            dismissButtonText: '',
            dismissButtonSelector: '',
            dismissButtonIndex: -1,
        };

        const rejectPatterns = /\b(reject|decline|deny|refuse|opt[- ]?out|manage|settings|preferences|customize|customise|do not|don't sell|only essential|necessary only|save preferences)\b/i;
        const acceptPatterns = /\b(accept|agree|ok|okay|got it|got-it|i understand|i agree|allow|consent|continue|confirm|acknowledge|dismiss|close|i'm fine|fine|enable|alle akzeptieren|akzeptieren|zustimmen|accepter|j'accepte|aceptar)\b/i;
        const closeLabelPatterns = /\b(close|dismiss|×|✕|✖)\b/i;

        function isVisible(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return false;
            return true;
        }

        function containsCookieKeywords(text) {
            return /\b(cookie|cookies|privacy|consent|gdpr|tracking|trackers|data protection|personal data|browsing experience)\b/i.test(text);
        }

        function getUniqueSelector(el) {
            if (el.id) return `#${CSS.escape(el.id)}`;
            const path = [];
            let current = el;
            while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                if (current.id) {
                    path.unshift(`#${CSS.escape(current.id)}`);
                    break;
                }
                if (current.className && typeof current.className === 'string') {
                    const classes = current.className.trim().split(/\s+/).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');
                    if (classes) selector += classes;
                }
                const parent = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
                    if (siblings.length > 1) {
                        const idx = siblings.indexOf(current) + 1;
                        selector += `:nth-of-type(${idx})`;
                    }
                }
                path.unshift(selector);
                current = current.parentElement;
            }
            return path.join(' > ');
        }

        // Look for common cookie banner containers
        const bannerSelectors = [
            '[class*="cookie" i]', '[id*="cookie" i]',
            '[class*="consent" i]', '[id*="consent" i]',
            '[class*="gdpr" i]', '[id*="gdpr" i]',
            '[class*="privacy" i]', '[id*="privacy" i]',
            '[class*="notice" i]', '[id*="notice" i]',
            '[class*="banner" i]', '[id*="banner" i]',
            '[class*="popup" i]', '[id*="popup" i]',
            '[class*="modal" i]', '[id*="modal" i]',
            '[class*="overlay" i]', '[id*="overlay" i]',
            '[role="dialog"]', '[role="alertdialog"]',
            '[aria-label*="cookie" i]', '[aria-label*="consent" i]',
            '[data-testid*="cookie" i]', '[data-testid*="consent" i]',
            '.cc-window', '.cc-banner', '#onetrust-consent-sdk',
            '#CybotCookiebotDialog', '.cky-consent-container',
            '#gdpr-consent-notice', '.osano-cm-window',
            '.js-consent-banner', '#truste-consent-track',
            '#sp_message_container_',
        ];

        let cookieBanners = [];
        for (const selector of bannerSelectors) {
            try {
                const els = document.querySelectorAll(selector);
                for (const el of els) {
                    if (isVisible(el)) {
                        const text = (el.textContent || '').trim();
                        if (text.length > 10 && text.length < 5000 && containsCookieKeywords(text)) {
                            cookieBanners.push(el);
                        }
                    }
                }
            } catch { /* invalid selector */ }
        }

        // Also look in shadow DOMs
        function searchShadowRoots(root) {
            const allEls = root.querySelectorAll('*');
            for (const el of allEls) {
                if (el.shadowRoot) {
                    for (const selector of bannerSelectors) {
                        try {
                            const shadowEls = el.shadowRoot.querySelectorAll(selector);
                            for (const shadowEl of shadowEls) {
                                if (isVisible(shadowEl)) {
                                    const text = (shadowEl.textContent || '').trim();
                                    if (text.length > 10 && text.length < 5000 && containsCookieKeywords(text)) {
                                        cookieBanners.push(shadowEl);
                                    }
                                }
                            }
                        } catch { /* ignore */ }
                    }
                    searchShadowRoots(el.shadowRoot);
                }
            }
        }
        searchShadowRoots(document);

        // Also check iframes (same origin only)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        for (const selector of bannerSelectors) {
                            try {
                                const els = iframeDoc.querySelectorAll(selector);
                                for (const el of els) {
                                    if (isVisible(el)) {
                                        const text = (el.textContent || '').trim();
                                        if (text.length > 10 && text.length < 5000 && containsCookieKeywords(text)) {
                                            cookieBanners.push(el);
                                        }
                                    }
                                }
                            } catch { /* ignore */ }
                        }
                    }
                } catch { /* cross-origin */ }
            }
        } catch { /* ignore */ }

        // Deduplicate (child elements of same banner)
        const unique = [];
        for (const banner of cookieBanners) {
            let dominated = false;
            for (const other of cookieBanners) {
                if (other !== banner && other.contains(banner)) {
                    dominated = true;
                    break;
                }
            }
            if (!dominated && !unique.includes(banner)) {
                unique.push(banner);
            }
        }
        cookieBanners = unique;

        if (cookieBanners.length === 0) {
            return result;
        }

        result.popupFound = true;

        // Look for buttons in the banners
        for (const banner of cookieBanners) {
            const interactives = banner.querySelectorAll('button, a[role="button"], [role="button"], input[type="button"], input[type="submit"], a.btn, a[class*="button" i], a[class*="btn" i], [class*="close" i], [aria-label*="close" i], [aria-label*="dismiss" i]');

            for (const el of interactives) {
                if (!isVisible(el)) continue;
                const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('value') || '').trim();

                if (rejectPatterns.test(text)) {
                    result.rejectButtonFound = true;
                    result.rejectButtonText = text.substring(0, 100);
                }
            }

            if (result.rejectButtonFound) break;

            for (const el of interactives) {
                if (!isVisible(el)) continue;
                const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('value') || '').trim();
                const ariaLabel = el.getAttribute('aria-label') || '';

                // Check if it's an "accept" type button
                if (acceptPatterns.test(text) || acceptPatterns.test(ariaLabel)) {
                    result.dismissButtonFound = true;
                    result.dismissButtonText = text.substring(0, 100) || ariaLabel.substring(0, 100);
                    result.dismissButtonSelector = getUniqueSelector(el);
                    break;
                }

                // Check for close/X buttons
                if (closeLabelPatterns.test(text) || closeLabelPatterns.test(ariaLabel) || text === '×' || text === 'X' || text === '✕') {
                    if (!result.dismissButtonFound) {
                        result.dismissButtonFound = true;
                        result.dismissButtonText = text || ariaLabel || '[X close button]';
                        result.dismissButtonSelector = getUniqueSelector(el);
                    }
                }
            }
        }

        return result;
    });
}

async function clickDismissButton(page, analysis) {
    if (!analysis.dismissButtonSelector) {
        throw new Error('No dismiss button selector available');
    }

    try {
        const el = await page.$(analysis.dismissButtonSelector);
        if (el) {
            await el.click({ timeout: 5000 });
            return;
        }
    } catch { /* fallback */ }

    // Fallback: find by text
    const buttonText = analysis.dismissButtonText;
    if (buttonText) {
        try {
            const btn = page.getByRole('button', { name: buttonText, exact: false });
            if (await btn.count() > 0) {
                await btn.first().click({ timeout: 5000 });
                return;
            }
        } catch { /* fallback */ }

        try {
            const link = page.getByRole('link', { name: buttonText, exact: false });
            if (await link.count() > 0) {
                await link.first().click({ timeout: 5000 });
                return;
            }
        } catch { /* fallback */ }

        try {
            await page.locator(`text="${buttonText}"`).first().click({ timeout: 5000 });
            return;
        } catch { /* fallback */ }
    }

    throw new Error(`Could not click dismiss button with selector "${analysis.dismissButtonSelector}" or text "${buttonText}"`);
}

function generateReport(results, outputDir) {
    const analyzed = results.filter((r) => r.status === 'analyzed');
    const disqualified = results.filter((r) => r.status === 'disqualified');
    const errors = results.filter((r) => r.status === 'error');

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cookie Notice Button Behavior Analysis</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --accent: #3b82f6;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #eab308;
    --orange: #f97316;
    --border: #475569;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 2rem;
  }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.4rem; margin: 2rem 0 1rem; color: var(--accent); }
  h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .stat-card {
    background: var(--surface);
    border-radius: 8px;
    padding: 1.2rem;
    border: 1px solid var(--border);
  }
  .stat-card .number {
    font-size: 2rem;
    font-weight: 700;
  }
  .stat-card .label { color: var(--text-muted); font-size: 0.85rem; }
  .green { color: var(--green); }
  .red { color: var(--red); }
  .yellow { color: var(--yellow); }
  .orange { color: var(--orange); }
  .site-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden;
  }
  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }
  .site-header:hover { background: var(--surface2); }
  .site-body { padding: 1.5rem; display: none; }
  .site-body.open { display: block; }
  .badge {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge-green { background: rgba(34,197,94,0.15); color: var(--green); }
  .badge-red { background: rgba(239,68,68,0.15); color: var(--red); }
  .badge-yellow { background: rgba(234,179,8,0.15); color: var(--yellow); }
  .badge-orange { background: rgba(249,115,22,0.15); color: var(--orange); }
  .screenshots {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin: 1rem 0;
  }
  .screenshots img {
    width: 100%;
    border-radius: 6px;
    border: 1px solid var(--border);
  }
  .screenshots .cap { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.3rem; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0;
    font-size: 0.85rem;
  }
  th, td {
    text-align: left;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  th { color: var(--text-muted); font-weight: 600; }
  td { word-break: break-all; }
  .url-cell { max-width: 600px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tag {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    background: var(--surface2);
    margin-right: 0.3rem;
  }
  .tag-new { background: rgba(249,115,22,0.2); color: var(--orange); }
  .collapsible-header {
    cursor: pointer;
    user-select: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .collapsible-header::before { content: '▶'; font-size: 0.7rem; transition: transform 0.2s; }
  .collapsible-header.open::before { transform: rotate(90deg); }
  .disqualified-list { margin: 0.5rem 0; }
  .disqualified-item {
    padding: 0.5rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }
  .disqualified-item .reason { color: var(--text-muted); font-size: 0.8rem; }
  .info-row {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .info-item { }
  .info-label { color: var(--text-muted); font-size: 0.8rem; }
  .info-value { font-weight: 600; }
  footer { margin-top: 3rem; color: var(--text-muted); font-size: 0.8rem; text-align: center; }
</style>
</head>
<body>
<h1>Cookie Notice Button Behavior Analysis</h1>
<p style="color:var(--text-muted)">Analysis of accept-like buttons in non-rejectable cookie notices with DuckDuckGo Privacy Extension</p>
<p style="color:var(--text-muted);font-size:0.85rem">Generated: ${new Date().toISOString()}</p>

<div class="summary">
  <div class="stat-card"><div class="number">${results.length}</div><div class="label">Total Sites</div></div>
  <div class="stat-card"><div class="number green">${analyzed.length}</div><div class="label">Analyzed (non-rejectable popup + clicked)</div></div>
  <div class="stat-card"><div class="number yellow">${disqualified.length}</div><div class="label">Disqualified</div></div>
  <div class="stat-card"><div class="number red">${errors.length}</div><div class="label">Errors</div></div>
  <div class="stat-card"><div class="number orange">${analyzed.filter((r) => r.newBlockedRequests.length > 0).length}</div><div class="label">Sites w/ New Blocked Requests After Click</div></div>
  <div class="stat-card"><div class="number orange">${analyzed.filter((r) => r.newBlockedDomains.length > 0).length}</div><div class="label">Sites w/ New Blocked Domains After Click</div></div>
</div>

<h2>Analyzed Sites (${analyzed.length})</h2>
`;

    for (const r of analyzed) {
        const hasNewBlocked = r.newBlockedRequests.length > 0;
        const hasNewDomains = r.newBlockedDomains.length > 0;
        const badgeClass = hasNewDomains ? 'badge-orange' : hasNewBlocked ? 'badge-yellow' : 'badge-green';
        const badgeText = hasNewDomains
            ? `${r.newBlockedDomains.length} new domain(s) blocked`
            : hasNewBlocked
              ? `${r.newBlockedRequests.length} new request(s) blocked`
              : 'No new blocked requests';

        html += `
<div class="site-card">
  <div class="site-header" onclick="this.nextElementSibling.classList.toggle('open')">
    <div>
      <strong>${escapeHtml(r.domain)}</strong>
      <span style="color:var(--text-muted);font-size:0.85rem;margin-left:0.5rem">${escapeHtml(r.url)}</span>
    </div>
    <div>
      <span class="badge ${badgeClass}">${badgeText}</span>
      <span class="badge badge-green">Dismiss: "${escapeHtml(r.dismissButtonText)}"</span>
    </div>
  </div>
  <div class="site-body">
    <div class="info-row">
      <div class="info-item"><div class="info-label">Dismiss Button</div><div class="info-value">"${escapeHtml(r.dismissButtonText)}"</div></div>
      <div class="info-item"><div class="info-label">Blocked Before Click</div><div class="info-value">${r.blockedRequestsBefore.length}</div></div>
      <div class="info-item"><div class="info-label">New Blocked After Click</div><div class="info-value">${r.newBlockedRequests.length}</div></div>
      <div class="info-item"><div class="info-label">New Blocked Domains</div><div class="info-value">${r.newBlockedDomains.length}</div></div>
    </div>

    <div class="screenshots">
      <div>
        <img src="${escapeHtml(r.screenshotBefore)}" alt="Before click" loading="lazy" />
        <div class="cap">Before clicking dismiss</div>
      </div>
      <div>
        ${r.screenshotAfter ? `<img src="${escapeHtml(r.screenshotAfter)}" alt="After click" loading="lazy" /><div class="cap">After clicking dismiss</div>` : '<div class="cap">No after screenshot</div>'}
      </div>
    </div>
${r.error ? `<p style="color:var(--red)">⚠ ${escapeHtml(r.error)}</p>` : ''}
`;

        if (r.newBlockedRequests.length > 0) {
            html += `
    <h3 class="collapsible-header" onclick="this.classList.toggle('open');this.nextElementSibling.style.display=this.classList.contains('open')?'table':'none'">New Blocked Requests After Click (${r.newBlockedRequests.length})</h3>
    <table style="display:none">
      <thead><tr><th>Domain</th><th>URL</th><th>New Domain?</th></tr></thead>
      <tbody>`;
            for (const req of r.newBlockedRequests) {
                const isNewDomain = !r.domainsBefore.has(req.domain);
                html += `
        <tr>
          <td>${escapeHtml(req.domain)}</td>
          <td class="url-cell" title="${escapeHtml(req.url)}">${escapeHtml(req.url)}</td>
          <td>${isNewDomain ? '<span class="tag tag-new">NEW DOMAIN</span>' : '-'}</td>
        </tr>`;
            }
            html += `
      </tbody>
    </table>`;
        }

        if (r.blockedRequestsBefore.length > 0) {
            html += `
    <h3 class="collapsible-header" onclick="this.classList.toggle('open');this.nextElementSibling.style.display=this.classList.contains('open')?'table':'none'">Blocked Requests Before Click (${r.blockedRequestsBefore.length})</h3>
    <table style="display:none">
      <thead><tr><th>Domain</th><th>URL</th></tr></thead>
      <tbody>`;
            for (const req of r.blockedRequestsBefore) {
                html += `
        <tr>
          <td>${escapeHtml(req.domain)}</td>
          <td class="url-cell" title="${escapeHtml(req.url)}">${escapeHtml(req.url)}</td>
        </tr>`;
            }
            html += `
      </tbody>
    </table>`;
        }

        html += `
  </div>
</div>`;
    }

    // Disqualified section
    html += `
<h2>Disqualified Sites (${disqualified.length})</h2>
<div class="disqualified-list">`;
    for (const r of disqualified) {
        html += `
  <div class="disqualified-item">
    <div>
      <strong>${escapeHtml(r.domain)}</strong>
      <span style="color:var(--text-muted);margin-left:0.5rem;font-size:0.85rem">${escapeHtml(r.url)}</span>
    </div>
    <div class="reason">${escapeHtml(r.disqualifyReason)}</div>
  </div>`;
    }
    html += `</div>`;

    // Errors section
    if (errors.length > 0) {
        html += `
<h2>Errors (${errors.length})</h2>
<div class="disqualified-list">`;
        for (const r of errors) {
            html += `
  <div class="disqualified-item">
    <div>
      <strong>${escapeHtml(r.domain)}</strong>
      <span style="color:var(--text-muted);margin-left:0.5rem;font-size:0.85rem">${escapeHtml(r.url)}</span>
    </div>
    <div class="reason" style="color:var(--red)">${escapeHtml(r.error || 'Unknown error')}</div>
  </div>`;
        }
        html += `</div>`;
    }

    html += `
<footer>
  <p>Cookie Notice Button Behavior Analysis — DuckDuckGo Privacy Extension</p>
  <p>Generated ${new Date().toISOString()}</p>
</footer>
<script>
// Auto-expand sites with new blocked domains
document.querySelectorAll('.site-card').forEach(card => {
  const badge = card.querySelector('.badge-orange');
  if (badge) card.querySelector('.site-body').classList.add('open');
});
</script>
</body>
</html>`;

    const reportPath = path.join(outputDir, 'report.html');
    fs.writeFileSync(reportPath, html);
    return reportPath;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function main() {
    console.log('=== Cookie Notice Button Behavior Analysis ===\n');

    const sites = parseSites(SITES_FILE);
    console.log(`Found ${sites.length} sites to analyze.\n`);

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('Launching browser with DuckDuckGo extension...');
    const context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-first-run',
            '--disable-popup-blocking',
        ],
        viewport: { width: 1280, height: 800 },
        ignoreHTTPSErrors: true,
    });

    // Wait for extension to initialize
    console.log('Waiting for extension to initialize...');
    await new Promise((r) => setTimeout(r, 3000));

    // Close any extension pages that opened
    for (const page of context.pages()) {
        const url = page.url();
        if (url.includes('duckduckgo') || url.includes('extension') || url === 'about:blank') {
            if (context.pages().length > 1) {
                try { await page.close(); } catch { /* ignore */ }
            }
        }
    }

    const results = [];
    for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        console.log(`\n[${i + 1}/${sites.length}] ${site.domain}`);
        const result = await analyzeSite(context, site, OUTPUT_DIR);

        // Serialize Sets for JSON storage
        result.domainsBefore = [...(result.domainsBefore || [])];
        result.domainsAfter = [...(result.domainsAfter || [])];

        results.push(result);

        // Save intermediate results
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'results.json'),
            JSON.stringify(results, null, 2),
        );
    }

    console.log('\nGenerating HTML report...');
    // Restore Sets for report generation
    for (const r of results) {
        r.domainsBefore = new Set(r.domainsBefore);
        r.domainsAfter = new Set(r.domainsAfter);
    }
    const reportPath = generateReport(results, OUTPUT_DIR);
    console.log(`Report saved to: ${reportPath}`);

    await context.close();
    console.log('\nDone!');
}

main().catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
});
