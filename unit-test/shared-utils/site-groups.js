import {
    addDomainToGroup,
    ALWAYS_BLOCK_GROUP_ID,
    applyElapsed,
    createDefaultGroups,
    DEFAULT_GROUP_ID,
    DEFAULT_GROUP_MAX_SECONDS,
    ensureAlwaysBlockGroup,
    findGroupForHostname,
    formatAllowance,
    formatRemaining,
    formatRemainingLong,
    getCurrentlyBlockedDomains,
    getNextResetTime,
    getPeriodKey,
    getRemainingSeconds,
    applyAllowedElapsed,
    getUsageDays,
    rollAllowedSiteUsage,
    rollUsageToPeriod,
    hostnameFromUrl,
    hostnameMatchesDomain,
    hoursMinutesToSeconds,
    isGroupSettingsLocked,
    normalizeGroup,
    removeDomainFromGroup,
    secondsToHoursMinutes,
} from '../../shared/js/shared-utils/site-groups';

describe('site groups helpers', () => {
    const youtubeGroup = {
        id: DEFAULT_GROUP_ID,
        name: 'Default',
        maxSecondsPerDay: 3000,
        domains: ['youtube.com'],
    };
    const alwaysGroup = {
        id: ALWAYS_BLOCK_GROUP_ID,
        name: 'Always Block',
        maxSecondsPerDay: 0,
        domains: ['example.com'],
    };

    it('creates Default and Always Block groups and migrates legacy domains', () => {
        expect(createDefaultGroups(['HTTPS://News.Example.com/path', 'example.com'])).toEqual([
            {
                id: DEFAULT_GROUP_ID,
                name: 'Default',
                maxSecondsPerDay: DEFAULT_GROUP_MAX_SECONDS,
                domains: [],
            },
            {
                id: ALWAYS_BLOCK_GROUP_ID,
                name: 'Always Block',
                maxSecondsPerDay: 0,
                domains: ['example.com', 'news.example.com'],
            },
        ]);
    });

    it('adds Always Block when it is missing from an existing list', () => {
        expect(ensureAlwaysBlockGroup([youtubeGroup])).toEqual([
            youtubeGroup,
            {
                id: ALWAYS_BLOCK_GROUP_ID,
                name: 'Always Block',
                maxSecondsPerDay: 0,
                domains: [],
            },
        ]);
        expect(ensureAlwaysBlockGroup([youtubeGroup, alwaysGroup])).toEqual([youtubeGroup, alwaysGroup]);
    });

    it('uses a 6:00 local-time day boundary', () => {
        const beforeReset = new Date(2026, 7, 14, 5, 59, 0).getTime();
        const atReset = new Date(2026, 7, 14, 6, 0, 0).getTime();

        expect(getPeriodKey(beforeReset)).toBe('2026-08-13');
        expect(getPeriodKey(atReset)).toBe('2026-08-14');
        expect(getNextResetTime(beforeReset)).toBe(atReset);
        expect(getNextResetTime(atReset)).toBe(new Date(2026, 7, 15, 6, 0, 0).getTime());
    });

    it('matches a hostname to the most specific group domain', () => {
        expect(hostnameMatchesDomain('www.youtube.com', 'youtube.com')).toBeTrue();
        expect(hostnameMatchesDomain('youtube.com', 'www.youtube.com')).toBeFalse();
        expect(hostnameFromUrl('https://m.youtube.com/watch?v=1')).toBe('m.youtube.com');

        const groups = [youtubeGroup, { id: 'music', name: 'Music', maxSecondsPerDay: 60, domains: ['music.youtube.com'] }];
        expect(findGroupForHostname(groups, 'music.youtube.com')?.id).toBe('music');
        expect(findGroupForHostname(groups, 'www.youtube.com')?.id).toBe(DEFAULT_GROUP_ID);
        expect(findGroupForHostname(groups, 'example.com')).toBeNull();
    });

    it('counts remaining time as a shared group budget', () => {
        const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const usage = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-14', usedSeconds: 20 },
        };

        expect(getRemainingSeconds(youtubeGroup, usage, now)).toBe(2980);
        expect(getRemainingSeconds(alwaysGroup, {}, now)).toBe(0);

        const after = applyElapsed(youtubeGroup, usage, 10, now);
        expect(after.remainingSeconds).toBe(2970);
        expect(after.expired).toBeFalse();
        expect(after.usage[DEFAULT_GROUP_ID].usedSeconds).toBe(30);

        const expired = applyElapsed(youtubeGroup, usage, 5000, now);
        expect(expired.expired).toBeTrue();
        expect(expired.remainingSeconds).toBe(0);
    });

    it('attributes elapsed time to the matching site and caps it at the daily budget', () => {
        const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const group = { ...youtubeGroup, domains: ['youtube.com', 'music.youtube.com', 'reddit.com'] };

        const first = applyElapsed(group, {}, 12, now, 'www.youtube.com');
        expect(first.usage[DEFAULT_GROUP_ID].domains).toEqual({ 'youtube.com': 12 });

        const second = applyElapsed(group, first.usage, 8, now, 'music.youtube.com');
        expect(second.usage[DEFAULT_GROUP_ID].usedSeconds).toBe(20);
        expect(second.usage[DEFAULT_GROUP_ID].domains).toEqual({
            'youtube.com': 12,
            'music.youtube.com': 8,
        });

        const reddit = applyElapsed(group, second.usage, 5, now, 'old.reddit.com');
        expect(reddit.usage[DEFAULT_GROUP_ID].domains['reddit.com']).toBe(5);

        const nearLimit = {
            [DEFAULT_GROUP_ID]: {
                periodKey: '2026-08-14',
                usedSeconds: 2990,
                domains: { 'youtube.com': 2990 },
            },
        };
        const capped = applyElapsed(youtubeGroup, nearLimit, 50, now, 'youtube.com');
        expect(capped.usage[DEFAULT_GROUP_ID].usedSeconds).toBe(3000);
        expect(capped.usage[DEFAULT_GROUP_ID].domains['youtube.com']).toBe(3000);

        const morning = new Date(2026, 7, 14, 7, 0, 0).getTime();
        const yesterday = {
            [DEFAULT_GROUP_ID]: {
                periodKey: '2026-08-13',
                usedSeconds: 100,
                domains: { 'youtube.com': 100 },
            },
        };
        const withOlderDay = {
            [DEFAULT_GROUP_ID]: {
                ...yesterday[DEFAULT_GROUP_ID],
                history: {
                    '2026-08-12': { usedSeconds: 40, domains: { 'youtube.com': 40 } },
                },
            },
        };
        const reset = applyElapsed(youtubeGroup, withOlderDay, 5, morning, 'youtube.com');
        expect(reset.usage[DEFAULT_GROUP_ID].usedSeconds).toBe(5);
        expect(reset.usage[DEFAULT_GROUP_ID].domains).toEqual({ 'youtube.com': 5 });
        expect(reset.usage[DEFAULT_GROUP_ID].history['2026-08-13']).toEqual({
            usedSeconds: 100,
            domains: { 'youtube.com': 100 },
        });
        expect(reset.usage[DEFAULT_GROUP_ID].history['2026-08-12'].usedSeconds).toBe(40);
    });

    it('keeps finished days and returns the last 7 for analytics', () => {
        const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const usage = {
            [DEFAULT_GROUP_ID]: {
                periodKey: '2026-08-13',
                usedSeconds: 100,
                domains: { 'youtube.com': 80, 'reddit.com': 20 },
                history: {
                    '2026-05-01': { usedSeconds: 9, domains: { 'youtube.com': 9 } },
                },
            },
        };

        const rolled = rollUsageToPeriod(usage, now);
        expect(rolled[DEFAULT_GROUP_ID].periodKey).toBe('2026-08-14');
        expect(rolled[DEFAULT_GROUP_ID].usedSeconds).toBe(0);
        expect(rolled[DEFAULT_GROUP_ID].history['2026-08-13'].usedSeconds).toBe(100);
        expect(rolled[DEFAULT_GROUP_ID].history['2026-05-01']).toBeUndefined();

        const continued = {
            ...rolled[DEFAULT_GROUP_ID],
            usedSeconds: 15,
            domains: { 'reddit.com': 15 },
        };
        const days = getUsageDays(youtubeGroup, { [DEFAULT_GROUP_ID]: continued }, now, 7);
        expect(days).toHaveSize(7);
        expect(days[0].periodKey).toBe('2026-08-08');
        expect(days[0].usedSeconds).toBe(0);
        expect(days[5]).toEqual(
            jasmine.objectContaining({
                periodKey: '2026-08-13',
                usedSeconds: 100,
                isToday: false,
            }),
        );
        expect(days[5].domains).toEqual({ 'youtube.com': 80, 'reddit.com': 20 });
        expect(days[6]).toEqual(
            jasmine.objectContaining({
                periodKey: '2026-08-14',
                usedSeconds: 15,
                isToday: true,
            }),
        );
    });

    it('records Allowed Sites time without a daily cap and keeps the previous day', () => {
        const yesterday = new Date(2026, 7, 13, 12, 0, 0).getTime();
        const today = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const first = applyAllowedElapsed(null, 5000, yesterday, 'wikipedia.org');
        expect(first.usedSeconds).toBe(5000);
        expect(first.domains).toEqual({ 'wikipedia.org': 5000 });

        const second = applyAllowedElapsed(first, 30, today, '*.edu');
        expect(second.periodKey).toBe('2026-08-14');
        expect(second.usedSeconds).toBe(30);
        expect(second.domains).toEqual({ '*.edu': 30 });
        expect(second.history['2026-08-13']).toEqual({
            usedSeconds: 5000,
            domains: { 'wikipedia.org': 5000 },
        });

        const rolled = rollAllowedSiteUsage(second, today);
        expect(rolled.usedSeconds).toBe(30);
        expect(rolled.history['2026-08-13'].usedSeconds).toBe(5000);
    });

    it('resets used time after the 6:00 boundary', () => {
        const morning = new Date(2026, 7, 14, 7, 0, 0).getTime();
        const usage = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-13', usedSeconds: 3000 },
        };
        expect(getRemainingSeconds(youtubeGroup, usage, morning)).toBe(3000);
    });

    it('locks timed groups after the budget is used, but not always-block groups', () => {
        const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const exhausted = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-14', usedSeconds: 3000 },
        };

        expect(isGroupSettingsLocked(youtubeGroup, exhausted, now)).toBeTrue();
        expect(isGroupSettingsLocked(youtubeGroup, {}, now)).toBeFalse();
        expect(isGroupSettingsLocked(alwaysGroup, {}, now)).toBeFalse();
        expect(isGroupSettingsLocked(alwaysGroup, exhausted, now)).toBeFalse();
    });

    it('blocks always-block and exhausted groups only', () => {
        const now = new Date(2026, 7, 14, 12, 0, 0).getTime();
        const groups = [youtubeGroup, alwaysGroup];
        const usage = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-14', usedSeconds: 10 },
        };

        expect(getCurrentlyBlockedDomains(groups, usage, now)).toEqual(['example.com']);

        const exhausted = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-14', usedSeconds: 3000 },
        };
        expect(getCurrentlyBlockedDomains(groups, exhausted, now)).toEqual(['example.com', 'youtube.com']);
    });

    it('moves a site when it is added to another group', () => {
        const groups = [
            { ...youtubeGroup, domains: ['youtube.com', 'reddit.com'] },
            { ...alwaysGroup, domains: [] },
        ];
        const moved = addDomainToGroup(groups, ALWAYS_BLOCK_GROUP_ID, 'https://youtube.com/watch');
        expect(moved[0].domains).toEqual(['reddit.com']);
        expect(moved[1].domains).toEqual(['youtube.com']);
        expect(removeDomainFromGroup(moved, ALWAYS_BLOCK_GROUP_ID, 'youtube.com')[1].domains).toEqual([]);
    });

    it('normalizes group fields and time formatting', () => {
        expect(
            normalizeGroup({
                id: ' g1 ',
                name: '  News  ',
                maxSecondsPerDay: 90,
                domains: ['HTTPS://Example.com/a', 'bad domain', 'example.com'],
            }),
        ).toEqual({
            id: 'g1',
            name: 'News',
            maxSecondsPerDay: 90,
            domains: ['example.com'],
        });
        expect(
            normalizeGroup({
                id: ALWAYS_BLOCK_GROUP_ID,
                name: 'Something else',
                maxSecondsPerDay: 600,
                domains: ['ads.example'],
            }),
        ).toEqual({
            id: ALWAYS_BLOCK_GROUP_ID,
            name: 'Always Block',
            maxSecondsPerDay: 0,
            domains: ['ads.example'],
        });
        expect(hoursMinutesToSeconds(1, 5)).toBe(3900);
        expect(secondsToHoursMinutes(3900)).toEqual({ hours: 1, minutes: 5 });
        expect(formatRemaining(59)).toBe('0:59');
        expect(formatRemainingLong(300)).toBe('0:05:00');
        expect(formatAllowance(0)).toBe('Always blocked');
        expect(formatAllowance(3000)).toBe('50 min allowed daily');
    });
});
