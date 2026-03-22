import fs from 'fs';
import path from 'path';

const outputDir = process.argv[2] || 'scripts/cookie-analysis/output';
const sitesFile = process.argv[3] || '/home/ubuntu/.cursor/projects/workspace/uploads/sites.txt';

const sites = fs.readFileSync(sitesFile, 'utf-8')
    .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => { const p = l.split('|'); return p.length >= 2 ? { domain: p[0], url: p[1] } : null; })
    .filter(Boolean);

const results = [];

for (const site of sites) {
    const siteDir = path.join(outputDir, site.domain.replace(/[^a-zA-Z0-9._-]/g, '_'));
    const entry = { domain: site.domain, url: site.url };

    try {
        entry.result = JSON.parse(fs.readFileSync(path.join(siteDir, 'result.json'), 'utf-8'));
    } catch { entry.result = { action: 'error', error: 'No result file' }; }

    try {
        entry.blockedBefore = JSON.parse(fs.readFileSync(path.join(siteDir, 'blocked_before.json'), 'utf-8'));
    } catch { entry.blockedBefore = []; }

    try {
        entry.newBlocked = JSON.parse(fs.readFileSync(path.join(siteDir, 'new_blocked.json'), 'utf-8'));
    } catch { entry.newBlocked = []; }

    try {
        entry.newBlockedNewDomains = JSON.parse(fs.readFileSync(path.join(siteDir, 'new_blocked_new_domains.json'), 'utf-8'));
    } catch { entry.newBlockedNewDomains = []; }

    entry.hasBeforeScreenshot = fs.existsSync(path.join(siteDir, 'before.png'));
    entry.hasAfterScreenshot = fs.existsSync(path.join(siteDir, 'after.png'));

    results.push(entry);
}

const analyzed = results.filter(r => r.result.action === 'click' && r.result.clickSuccess);
const skipped = results.filter(r => r.result.action === 'skip');
const errors = results.filter(r => r.result.action === 'error' || (r.result.action === 'click' && !r.result.clickSuccess));
const withNewBlocked = analyzed.filter(r => r.newBlocked.length > 0);
const withNewBlockedNewDomains = analyzed.filter(r => r.newBlockedNewDomains.length > 0);

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncateUrl(url, max = 80) {
    if (url.length <= max) return escapeHtml(url);
    return escapeHtml(url.substring(0, max)) + '&hellip;';
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cookie Notice Button Behavior Analysis</title>
<style>
  :root { --bg: #0f1117; --card: #1a1d27; --border: #2a2d37; --text: #e4e4e7; --muted: #9ca3af; --accent: #3b82f6; --danger: #ef4444; --success: #22c55e; --warning: #f59e0b; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.4rem; margin: 2rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
  h3 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; }
  .subtitle { color: var(--muted); margin-bottom: 2rem; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem; }
  .stat-card .number { font-size: 2rem; font-weight: bold; }
  .stat-card .label { color: var(--muted); font-size: 0.85rem; }
  .stat-card.highlight { border-color: var(--danger); }
  .stat-card.highlight .number { color: var(--danger); }
  .stat-card.success .number { color: var(--success); }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; background: var(--card); border-radius: 8px; overflow: hidden; }
  th { background: #22252f; text-align: left; padding: 0.75rem 1rem; font-size: 0.85rem; text-transform: uppercase; color: var(--muted); letter-spacing: 0.05em; }
  td { padding: 0.6rem 1rem; border-top: 1px solid var(--border); font-size: 0.9rem; }
  tr:hover td { background: rgba(59,130,246,0.05); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .badge-red { background: rgba(239,68,68,0.15); color: var(--danger); }
  .badge-green { background: rgba(34,197,94,0.15); color: var(--success); }
  .badge-yellow { background: rgba(245,158,11,0.15); color: var(--warning); }
  .badge-gray { background: rgba(156,163,175,0.15); color: var(--muted); }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .domain-url { font-size: 0.8rem; color: var(--muted); }
  .finding-card { background: var(--card); border: 1px solid var(--border); border-left: 3px solid var(--danger); border-radius: 8px; padding: 1.2rem; margin: 1rem 0; }
  .finding-card h4 { margin-bottom: 0.5rem; }
  .finding-card .blocked-list { margin-top: 0.5rem; }
  .finding-card .blocked-item { font-family: monospace; font-size: 0.8rem; color: var(--muted); padding: 2px 0; word-break: break-all; }
  .finding-card .blocked-domain { color: var(--danger); font-weight: 600; }
  .summary-box { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin: 1rem 0; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.8rem; }
</style>
</head>
<body>

<h1>Cookie Notice Button Behavior Analysis</h1>
<p class="subtitle">Analysis of accept-like buttons in non-rejectable cookie notices, with DuckDuckGo extension blocking data. Generated ${new Date().toISOString().split('T')[0]}.</p>

<div class="stats">
  <div class="stat-card"><div class="number">${results.length}</div><div class="label">Total Sites</div></div>
  <div class="stat-card success"><div class="number">${analyzed.length}</div><div class="label">Analyzed (Click Performed)</div></div>
  <div class="stat-card"><div class="number">${skipped.length}</div><div class="label">Disqualified / Skipped</div></div>
  <div class="stat-card highlight"><div class="number">${withNewBlocked.length}</div><div class="label">Sites with New Blocked Requests</div></div>
  <div class="stat-card highlight"><div class="number">${withNewBlockedNewDomains.length}</div><div class="label">Sites with Blocked Requests to New Domains</div></div>
</div>

<div class="summary-box">
<h3>Key Finding</h3>
<p>Out of <strong>${analyzed.length}</strong> sites with non-rejectable cookie notices where an accept/dismiss button was clicked, 
<strong>${withNewBlocked.length}</strong> (${Math.round(withNewBlocked.length / analyzed.length * 100)}%) triggered new tracker requests that were blocked by the DuckDuckGo extension.
Of these, <strong>${withNewBlockedNewDomains.length}</strong> sites sent requests to entirely new tracking domains not previously contacted by the page.</p>
</div>

<h2>Sites with New Blocked Requests After Clicking Accept</h2>
<p style="color:var(--muted);margin-bottom:1rem;">These sites triggered new tracking requests after the cookie notice dismiss button was clicked. Requests were blocked by the DuckDuckGo Privacy Extension.</p>

${withNewBlocked.sort((a, b) => b.newBlocked.length - a.newBlocked.length).map(site => {
    const newDomains = [...new Set(site.newBlockedNewDomains.map(r => r.domain))];
    const allDomains = [...new Set(site.newBlocked.map(r => r.domain))];
    return `
<div class="finding-card">
  <h4><a href="${escapeHtml(site.url)}" target="_blank">${escapeHtml(site.domain)}</a>
    <span class="badge badge-red">${site.newBlocked.length} new blocked</span>
    ${site.newBlockedNewDomains.length > 0 ? `<span class="badge badge-red">${site.newBlockedNewDomains.length} to new domains</span>` : ''}
  </h4>
  <div style="font-size:0.85rem;color:var(--muted);">
    Before click: ${site.result.blockedBeforeCount} blocked | After click: ${site.result.blockedAfterCount} blocked
  </div>
  <div class="blocked-list">
    <strong style="font-size:0.85rem;">New blocked tracker domains:</strong>
    ${allDomains.map(d => `<div class="blocked-item"><span class="blocked-domain">${escapeHtml(d)}</span>${newDomains.includes(d) ? ' <span class="badge badge-red">NEW DOMAIN</span>' : ''}</div>`).join('')}
  </div>
  <details style="margin-top:0.5rem;font-size:0.8rem;">
    <summary style="cursor:pointer;color:var(--accent);">Show all ${site.newBlocked.length} blocked URLs</summary>
    ${site.newBlocked.map(r => `<div class="blocked-item">${truncateUrl(r.url, 120)}</div>`).join('')}
  </details>
</div>`;
}).join('')}

<h2>All Analyzed Sites</h2>
<table>
<thead><tr><th>Domain</th><th>Dismiss Button</th><th>Blocked Before</th><th>Blocked After</th><th>New Blocked</th><th>New Domains</th></tr></thead>
<tbody>
${analyzed.sort((a, b) => b.newBlocked.length - a.newBlocked.length).map(site => `
<tr>
  <td><a href="${escapeHtml(site.url)}" target="_blank">${escapeHtml(site.domain)}</a></td>
  <td>${site.result.clickSuccess ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-red">Failed</span>'}</td>
  <td>${site.result.blockedBeforeCount}</td>
  <td>${site.result.blockedAfterCount}</td>
  <td>${site.newBlocked.length > 0 ? `<span class="badge badge-red">${site.newBlocked.length}</span>` : '<span class="badge badge-green">0</span>'}</td>
  <td>${site.newBlockedNewDomains.length > 0 ? `<span class="badge badge-red">${site.newBlockedNewDomains.length}</span>` : '<span class="badge badge-green">0</span>'}</td>
</tr>`).join('')}
</tbody>
</table>

<h2>Disqualified / Skipped Sites</h2>
<table>
<thead><tr><th>Domain</th><th>Reason</th></tr></thead>
<tbody>
${skipped.map(site => `
<tr>
  <td><a href="${escapeHtml(site.url)}" target="_blank">${escapeHtml(site.domain)}</a></td>
  <td><span class="badge badge-gray">${escapeHtml(site.result.reason || 'Unknown')}</span></td>
</tr>`).join('')}
</tbody>
</table>

<footer>
  <p>Generated by cookie-analysis tool using Playwright + DuckDuckGo Privacy Extension. Cookie notices were identified through visual screenshot analysis (no regex pattern matching).</p>
  <p>Method: Each site was loaded in Chromium with the DuckDuckGo extension. Network requests blocked by the extension were recorded before and after clicking the cookie notice dismiss button. "New blocked" = requests blocked after click that were not blocked before. "New domains" = blocked requests to domains not previously requested by the page at all.</p>
</footer>

</body>
</html>`;

const reportPath = path.join('scripts/cookie-analysis', 'report.html');
fs.writeFileSync(reportPath, html);
console.log(`Report written to ${reportPath}`);
console.log(`\nSummary:`);
console.log(`  Total sites: ${results.length}`);
console.log(`  Analyzed: ${analyzed.length}`);
console.log(`  Skipped: ${skipped.length}`);
console.log(`  Errors: ${errors.length}`);
console.log(`  With new blocked: ${withNewBlocked.length}`);
console.log(`  With new blocked to new domains: ${withNewBlockedNewDomains.length}`);
