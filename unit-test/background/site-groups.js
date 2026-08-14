import settings from '../../shared/js/background/settings';
import { createSiteGroup, ensureSiteGroups, getSiteGroups, updateSiteGroup } from '../../shared/js/background/site-groups-store';
import { ALWAYS_BLOCK_GROUP_ID, DEFAULT_GROUP_ID, DEFAULT_GROUP_MAX_SECONDS } from '../../shared/js/shared-utils/site-groups';

describe('site groups store', () => {
    let settingsStorage;

    beforeEach(() => {
        settingsStorage = new Map();
        spyOn(settings, 'ready').and.returnValue(Promise.resolve());
        spyOn(settings, 'getSetting').and.callFake((name) => settingsStorage.get(name));
        spyOn(settings, 'updateSetting').and.callFake((name, value) => {
            settingsStorage.set(name, value);
        });
    });

    it('creates default groups and migrates the legacy block list', async () => {
        settingsStorage.set('blockedSites', { 'old.example': true, skipped: false });

        const groups = await ensureSiteGroups();

        expect(groups).toEqual([
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
                domains: ['old.example'],
            },
        ]);
        expect(settingsStorage.get('siteGroupsInitialized')).toBeTrue();
        expect(await ensureSiteGroups()).toEqual(groups);
    });

    it('creates and updates groups without replacing assigned sites', async () => {
        await ensureSiteGroups();
        const created = createSiteGroup({ name: 'Social', maxSecondsPerDay: 600, domains: ['reddit.com'] });

        expect(getSiteGroups().some((group) => group.id === created.id)).toBeTrue();
        expect(updateSiteGroup(created.id, { name: 'Social media', maxSecondsPerDay: 120 }).domains).toEqual(['reddit.com']);
        expect(getSiteGroups().find((group) => group.id === created.id)).toEqual({
            id: created.id,
            name: 'Social media',
            maxSecondsPerDay: 120,
            domains: ['reddit.com'],
        });
    });
});
