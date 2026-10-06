/* global BUILD_TARGET */
const bel = require('nanohtml');
const browser = require('webextension-polyfill');
const { parse } = require('tldts');
const { isGlobPattern } = require('../../shared-utils/allowed-sites');
const t = window.DDG.base.i18n.t;

function faviconPageUrl(domain) {
    if (typeof domain !== 'string' || isGlobPattern(domain)) {
        return null;
    }
    const parsed = parse(domain, { allowPrivateDomains: true });
    if (!parsed.domain || parsed.isIp || parsed.hostname !== domain) {
        return null;
    }
    const host = parsed.subdomain ? domain : `www.${domain}`;
    return `https://${host}/`;
}

function faviconURL(domain) {
    if (typeof BUILD_TARGET === 'undefined' || BUILD_TARGET !== 'chrome') {
        return null;
    }
    const pageUrl = faviconPageUrl(domain);
    if (!pageUrl || typeof browser.runtime?.getURL !== 'function') {
        return null;
    }
    try {
        const url = new URL(browser.runtime.getURL('/_favicon/'));
        url.searchParams.set('pageUrl', pageUrl);
        url.searchParams.set('size', '32');
        return url.toString();
    } catch {
        return null;
    }
}

function siteIcon(domain) {
    const src = faviconURL(domain);
    if (!src) {
        return null;
    }
    return bel`<img class="time-analytics-site__icon" src="${src}" alt="" width="16" height="16">`;
}

function formatDuration(seconds) {
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const minutesAndSeconds = `${minutes}m ${secs}s`;
    return hours > 0 ? `${hours}h ${minutesAndSeconds}` : minutesAndSeconds;
}

function duration(seconds) {
    return bel`<span class="time-analytics-duration">${formatDuration(seconds)}</span>`;
}

function dayRow(day, scaleSeconds, capped) {
    const percent = scaleSeconds ? Math.min(100, Math.round((day.usedSeconds / scaleSeconds) * 100)) : 0;
    const usedUp = capped && scaleSeconds > 0 && day.usedSeconds >= scaleSeconds;
    return bel`<li class="time-analytics-day${usedUp ? ' is-used-up' : ''}${day.isToday ? ' is-today' : ''}">
        <span class="time-analytics-day__label">${day.label}</span>
        <span class="time-analytics-day__meter" aria-hidden="true">
            <span class="time-analytics-day__fill" style="width: ${percent}%"></span>
        </span>
        <span class="time-analytics-day__time">${duration(day.usedSeconds)}</span>
    </li>`;
}

function siteRow(site, scaleSeconds) {
    const percent = scaleSeconds ? Math.min(100, Math.round((site.usedSeconds / scaleSeconds) * 100)) : 0;
    return bel`<li class="time-analytics-site">
        <span class="time-analytics-site__name">${siteIcon(site.domain)}<span>${site.domain}</span></span>
        <span class="time-analytics-site__meter" aria-hidden="true">
            <span class="time-analytics-site__fill" style="width: ${percent}%"></span>
        </span>
        <span class="time-analytics-site__time">${duration(site.usedSeconds)}</span>
    </li>`;
}

function groupSiteScale(group) {
    const dayCount = (group.days || []).length;
    const allowance = Number(group.maxSecondsPerDay) || 0;
    if (allowance > 0 && dayCount > 0) {
        return allowance * dayCount;
    }
    return group.usedSeconds || 0;
}

function row(group) {
    const days = group.days || [];
    const sites = group.sites || [];
    return bel`<li class="time-analytics-row">
        <div class="time-analytics-row__header">
            <h3 class="time-analytics-row__name">${t('options:timeAnalyticsGroupLabel.title', { name: group.name })}</h3>
            <p class="time-analytics-row__times">
                <span>${t('options:timeAnalyticsTotalLabel.title')} ${duration(group.usedSeconds)}</span>
                <span>${t('options:timeAnalyticsDailyAllowance.title')} ${duration(group.maxSecondsPerDay)}</span>
            </p>
        </div>
        ${days.length ? bel`<ul class="time-analytics-days">${days.map((day) => dayRow(day, group.maxSecondsPerDay, true))}</ul>` : null}
        ${sites.length ? bel`<ul class="time-analytics-sites">${sites.map((site) => siteRow(site, groupSiteScale(group)))}</ul>` : null}
    </li>`;
}

function allowedSection(allowed) {
    const days = allowed?.days || [];
    const sites = allowed?.sites || [];
    const peak = days.reduce((max, day) => Math.max(max, day.usedSeconds), 0);
    if (!days.length && !sites.length) {
        return bel`<p class="time-analytics-empty">${t('options:timeAnalyticsAllowedEmpty.title')}</p>`;
    }
    return bel`<div>
        <p class="time-analytics-row__times time-analytics-allowed__total">
            <span>${t('options:timeAnalyticsTotalLabel.title')} ${duration(allowed.usedSeconds || 0)}</span>
        </p>
        ${days.length ? bel`<ul class="time-analytics-days">${days.map((day) => dayRow(day, peak, false))}</ul>` : null}
        ${sites.length ? bel`<ul class="time-analytics-sites">${sites.map((site) => siteRow(site, allowed.usedSeconds || 0))}</ul>` : null}
    </div>`;
}

module.exports = function () {
    const groups = this.model.groups || [];
    const allowed = this.model.allowedSites || { usedSeconds: 0, days: [], sites: [] };
    const showAllowed = this.model.filter === 'allowed';
    const showWeek = this.model.range === 'week';
    return bel`<section class="options-content__time-analytics">
        <div class="time-analytics-heading">
            <h2 class="menu-title">${t('options:timeAnalyticsHeading.title')} <span class="time-analytics-beta">(beta)</span></h2>
        </div>
        <p class="menu-paragraph">${showWeek ? t('options:timeAnalyticsDesc.title') : t('options:timeAnalyticsDescToday.title')}</p>
        <div class="time-analytics-filters">
            <label class="time-analytics-filter">
                <span class="time-analytics-filter__label">${t('options:timeAnalyticsFilterLabel.title')}</span>
                <select class="js-time-analytics-filter">
                    <option value="blocked" selected=${!showAllowed}>${t('options:blockSitesTab.title')}</option>
                    <option value="allowed" selected=${showAllowed}>${t('options:allowedSitesTab.title')}</option>
                </select>
            </label>
            <label class="time-analytics-filter">
                <span class="time-analytics-filter__label">${t('options:timeAnalyticsRangeLabel.title')}</span>
                <select class="js-time-analytics-range">
                    <option value="today" selected=${!showWeek}>${t('options:timeAnalyticsRangeToday.title')}</option>
                    <option value="week" selected=${showWeek}>${t('options:timeAnalyticsRange.title')}</option>
                </select>
            </label>
        </div>
        ${
            showAllowed
                ? bel`<section class="time-analytics-section">
                    <p class="menu-paragraph">${t('options:timeAnalyticsAllowedDesc.title')}</p>
                    ${allowedSection(allowed)}
                </section>`
                : bel`<section class="time-analytics-section">
                    ${
                        groups.length
                            ? bel`<ul class="time-analytics-list">${groups.map(row)}</ul>`
                            : bel`<p class="time-analytics-empty">${t('options:timeAnalyticsEmpty.title')}</p>`
                    }
                </section>`
        }
    </section>`;
};
