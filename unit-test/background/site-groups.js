import settings from '../../shared/js/background/settings';
import SiteGroups from '../../shared/js/background/components/site-groups';
import { createSiteGroup, ensureSiteGroups, getSiteGroups, updateSiteGroup } from '../../shared/js/background/site-groups-store';
import {
    ALWAYS_BLOCK_GROUP_ID,
    DEFAULT_GROUP_ID,
    DEFAULT_GROUP_MAX_SECONDS,
    getPeriodKey,
} from '../../shared/js/shared-utils/site-groups';

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

    it('creates Always Block on a fresh install with no legacy sites', async () => {
        const groups = await ensureSiteGroups();
        expect(groups.find((group) => group.id === ALWAYS_BLOCK_GROUP_ID)).toEqual({
            id: ALWAYS_BLOCK_GROUP_ID,
            name: 'Always Block',
            maxSecondsPerDay: 0,
            domains: [],
        });
        expect(groups.find((group) => group.id === DEFAULT_GROUP_ID)).toBeDefined();
    });

    it('restores Always Block if it was missing after initialization', async () => {
        settingsStorage.set('siteGroupsInitialized', true);
        settingsStorage.set('siteGroups', [
            {
                id: DEFAULT_GROUP_ID,
                name: 'Default',
                maxSecondsPerDay: DEFAULT_GROUP_MAX_SECONDS,
                domains: [],
            },
        ]);

        const groups = await ensureSiteGroups();
        expect(groups.map((group) => group.id)).toEqual([DEFAULT_GROUP_ID, ALWAYS_BLOCK_GROUP_ID]);
        expect(groups.find((group) => group.id === ALWAYS_BLOCK_GROUP_ID).maxSecondsPerDay).toBe(0);
    });

    it('creates and updates groups without replacing assigned sites', async () => {
        await ensureSiteGroups();
        const created = createSiteGroup({ name: 'Social', maxSecondsPerDay: 600, domains: ['reddit.com'] });

        expect(getSiteGroups()[0]).toEqual(created);
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

describe('locked group mutations', () => {
    let settingsStorage;
    let siteGroups;

    beforeEach(async () => {
        settingsStorage = new Map();
        spyOn(settings, 'ready').and.returnValue(Promise.resolve());
        spyOn(settings, 'getSetting').and.callFake((name) => settingsStorage.get(name));
        spyOn(settings, 'updateSetting').and.callFake((name, value) => {
            settingsStorage.set(name, value);
        });

        settingsStorage.set('siteGroupsInitialized', true);
        settingsStorage.set('siteGroups', [
            { id: 'timed', name: 'Social', maxSecondsPerDay: 60, domains: ['reddit.com'] },
            { id: 'open', name: 'News', maxSecondsPerDay: 600, domains: ['cnn.com'] },
            { id: ALWAYS_BLOCK_GROUP_ID, name: 'Always Block', maxSecondsPerDay: 0, domains: [] },
        ]);
        settingsStorage.set('groupUsage', {
            timed: { periodKey: getPeriodKey(), usedSeconds: 60 },
        });

        siteGroups = new SiteGroups({ settings });
        await siteGroups._ready;
    });

    it('rejects edits to an exhausted group but allows other groups', async () => {
        const updateLocked = await siteGroups.handleUpdate({ id: 'timed', name: 'Nope', maxSecondsPerDay: 3600 });
        expect(updateLocked.saved).toBeFalse();
        expect(updateLocked.locked).toBeTrue();
        expect(getSiteGroups().find((group) => group.id === 'timed').maxSecondsPerDay).toBe(60);

        const updateOpen = await siteGroups.handleUpdate({ id: 'open', name: 'News sites', maxSecondsPerDay: 600 });
        expect(updateOpen.saved).toBeTrue();
        expect(getSiteGroups().find((group) => group.id === 'open').name).toBe('News sites');

        const addLocked = await siteGroups.handleAddDomain({ groupId: 'timed', domain: 'x.com' });
        expect(addLocked.saved).toBeTrue();
        expect(getSiteGroups().find((group) => group.id === 'timed').domains).toEqual(['reddit.com', 'x.com']);

        const removeLocked = await siteGroups.handleRemoveDomain({ groupId: 'timed', domain: 'reddit.com' });
        expect(removeLocked.saved).toBeFalse();
        expect(getSiteGroups().find((group) => group.id === 'timed').domains).toEqual(['reddit.com', 'x.com']);

        const steal = await siteGroups.handleAddDomain({ groupId: 'open', domain: 'reddit.com' });
        expect(steal.saved).toBeFalse();
        expect(getSiteGroups().find((group) => group.id === 'timed').domains).toEqual(['reddit.com', 'x.com']);

        const addOpen = await siteGroups.handleAddDomain({ groupId: 'open', domain: 'bbc.com' });
        expect(addOpen.saved).toBeTrue();

        const always = await siteGroups.handleAddDomain({ groupId: ALWAYS_BLOCK_GROUP_ID, domain: 'ads.example' });
        expect(always.saved).toBeTrue();

        const renameAlways = await siteGroups.handleUpdate({
            id: ALWAYS_BLOCK_GROUP_ID,
            name: 'Nope',
            maxSecondsPerDay: 600,
        });
        expect(renameAlways.saved).toBeFalse();
        expect(getSiteGroups().find((group) => group.id === ALWAYS_BLOCK_GROUP_ID)).toEqual({
            id: ALWAYS_BLOCK_GROUP_ID,
            name: 'Always Block',
            maxSecondsPerDay: 0,
            domains: ['ads.example'],
        });

        const deleteAlways = await siteGroups.handleDelete({ id: ALWAYS_BLOCK_GROUP_ID });
        expect(deleteAlways.saved).toBeFalse();
        expect(getSiteGroups().some((group) => group.id === ALWAYS_BLOCK_GROUP_ID)).toBeTrue();

        const deleteLocked = await siteGroups.handleDelete({ id: 'timed' });
        expect(deleteLocked.saved).toBeFalse();
        expect(getSiteGroups().some((group) => group.id === 'timed')).toBeTrue();
    });
});
