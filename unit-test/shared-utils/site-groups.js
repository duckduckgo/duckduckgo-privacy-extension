import {
    addDomainToGroup,
    ALWAYS_BLOCK_GROUP_ID,
    applyElapsed,
    createDefaultGroups,
    DEFAULT_GROUP_ID,
    DEFAULT_GROUP_MAX_SECONDS,
    findGroupForHostname,
    formatAllowance,
    formatRemaining,
    formatRemainingLong,
    getCurrentlyBlockedDomains,
    getNextResetTime,
    getPeriodKey,
    getRemainingSeconds,
    hostnameFromUrl,
    hostnameMatchesDomain,
    hoursMinutesToSeconds,
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

    it('resets used time after the 6:00 boundary', () => {
        const morning = new Date(2026, 7, 14, 7, 0, 0).getTime();
        const usage = {
            [DEFAULT_GROUP_ID]: { periodKey: '2026-08-13', usedSeconds: 3000 },
        };
        expect(getRemainingSeconds(youtubeGroup, usage, morning)).toBe(3000);
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
        expect(hoursMinutesToSeconds(1, 5)).toBe(3900);
        expect(secondsToHoursMinutes(3900)).toEqual({ hours: 1, minutes: 5 });
        expect(formatRemaining(59)).toBe('0:59');
        expect(formatRemainingLong(300)).toBe('0:05:00');
        expect(formatAllowance(0)).toBe('Always blocked');
        expect(formatAllowance(3000)).toBe('50 min allowed daily');
    });
});
