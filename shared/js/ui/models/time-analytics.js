const Parent = window.DDG.base.Model;

function formatDayLabel(periodKey) {
    const [year, month, day] = String(periodKey).split('-').map(Number);
    if (!year || !month || !day) {
        return String(periodKey);
    }
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(year, month - 1, day));
}

function sitesFor(group) {
    /** @type {Record<string, number>} */
    const totals = {};
    for (const day of group.usageDays || []) {
        const domains = day?.domains && typeof day.domains === 'object' ? day.domains : {};
        for (const [domain, seconds] of Object.entries(domains)) {
            const used = Number(seconds) || 0;
            if (used > 0) {
                totals[domain] = (totals[domain] || 0) + used;
            }
        }
    }
    const names = new Set([...(Array.isArray(group.domains) ? group.domains : []), ...Object.keys(totals)]);
    return [...names]
        .filter(Boolean)
        .map((domain) => ({
            domain,
            usedSeconds: Math.max(0, Number(totals[domain]) || 0),
        }))
        .sort((a, b) => b.usedSeconds - a.usedSeconds || String(a.domain).localeCompare(String(b.domain)));
}

function daysFor(group) {
    const days = Array.isArray(group.usageDays) ? group.usageDays : [];
    return days.map((day) => ({
        periodKey: day.periodKey,
        label: formatDayLabel(day.periodKey),
        usedSeconds: Math.max(0, Number(day.usedSeconds) || 0),
        isToday: Boolean(day.isToday),
        domains: day?.domains && typeof day.domains === 'object' ? day.domains : {},
    }));
}

function daysInRange(days, range) {
    const list = Array.isArray(days) ? days : [];
    return range === 'week' ? list : list.filter((day) => day.isToday);
}

function summarizeGroup(group, range) {
    const listed = Array.isArray(group.domains) ? group.domains : [];
    const days = daysInRange(daysFor(group), range);
    return {
        id: group.id,
        name: group.name,
        maxSecondsPerDay: Number(group.maxSecondsPerDay) || 0,
        usedSeconds: days.reduce((sum, day) => sum + day.usedSeconds, 0),
        days,
        sites: sitesFor({ domains: listed, usageDays: days }),
    };
}

function summarizeAllowed(allowed, range) {
    const patterns = Array.isArray(allowed?.patterns) ? allowed.patterns : [];
    const days = daysInRange(daysFor({ usageDays: allowed?.usageDays || [] }), range);
    return {
        usedSeconds: days.reduce((sum, day) => sum + day.usedSeconds, 0),
        days,
        sites: sitesFor({ domains: patterns, usageDays: days }),
    };
}

function TimeAnalytics(attrs) {
    attrs.groups = [];
    attrs.allowedSites = { usedSeconds: 0, days: [], sites: [] };
    attrs.filter = attrs.filter === 'allowed' ? 'allowed' : 'blocked';
    attrs.range = attrs.range === 'week' ? 'week' : 'today';
    Parent.call(this, attrs);
    this._groups = [];
    this._allowed = null;
}

TimeAnalytics.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'timeAnalytics',

    async getState() {
        let state = null;
        try {
            state = await this.sendMessage('getSiteGroupsState');
        } catch (error) {
            state = null;
        }

        const groups = Array.isArray(state?.groups) ? state.groups : [];
        this._groups = groups.filter((group) => group && Number(group.maxSecondsPerDay) > 0);
        this._allowed = state?.allowedSites || null;
        this.applyRange();
    },

    applyRange() {
        const range = this.range === 'week' ? 'week' : 'today';
        this.groups = this._groups
            .map((group) => summarizeGroup(group, range))
            .sort((a, b) => b.usedSeconds - a.usedSeconds || String(a.name).localeCompare(String(b.name)));
        this.allowedSites = summarizeAllowed(this._allowed, range);
    },
});

module.exports = TimeAnalytics;
