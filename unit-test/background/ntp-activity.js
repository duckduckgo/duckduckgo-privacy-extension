import NTPActivityCollection from '../../shared/js/background/components/ntp-activity';
import { TrackerBlockedEvent } from '../../shared/js/background/before-request';

describe('NTPActivityCollection component', () => {
    /** @type {NTPActivityCollection} */
    let collection;
    /** @type {{ recordBlockedTrackers: jasmine.Spy, recordVisit: jasmine.Spy, prune: jasmine.Spy, updateTitle: jasmine.Spy }} */
    let fakeStore;

    beforeEach(() => {
        fakeStore = jasmine.createSpyObj('store', {
            recordBlockedTrackers: Promise.resolve(),
            recordVisit: Promise.resolve(),
            prune: Promise.resolve(),
            updateTitle: Promise.resolve(true),
        });
        // @ts-ignore - fake store
        collection = new NTPActivityCollection({ store: fakeStore });
        jasmine.clock().install();
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });

    it('buffers blocked tracker events and flushes them as per-company counts', async () => {
        collection.tabSites.set(1, { host: 'example.com', etldPlusOne: 'example.com' });

        const changed = [];
        collection.onChange((hosts) => changed.push(...hosts));

        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Google', tabId: 1, tabHost: 'example.com' }));
        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Google', tabId: 1, tabHost: 'example.com' }));
        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Facebook', tabId: 1, tabHost: 'example.com' }));

        expect(fakeStore.recordBlockedTrackers).not.toHaveBeenCalled();
        jasmine.clock().tick(1001);
        await Promise.resolve();

        expect(fakeStore.recordBlockedTrackers).toHaveBeenCalledOnceWith(
            { host: 'example.com', etldPlusOne: 'example.com' },
            { Google: 2, Facebook: 1 },
        );
        expect(changed).toEqual(['example.com']);
    });

    it('ignores blocked tracker events for tabs it is not tracking', () => {
        // no visit recorded for tab 1 (e.g. incognito, or a non-http page)
        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Google', tabId: 1, tabHost: 'example.com' }));
        // tab 2 has since navigated to a different site
        collection.tabSites.set(2, { host: 'other.com', etldPlusOne: 'other.com' });
        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Google', tabId: 2, tabHost: 'example.com' }));
        // event without tab context (e.g. from an older emitter)
        collection.handleTrackerBlocked(new TrackerBlockedEvent({ companyDisplayName: 'Google' }));

        expect(collection.pendingCounts.size).toBe(0);
    });

    it('only updates titles for the site still loaded in the tab', async () => {
        collection.tabSites.set(1, { host: 'example.com', etldPlusOne: 'example.com' });

        await collection.handleTitleChange(1, 'https://example.com/page', 'Example Page');
        expect(fakeStore.updateTitle).toHaveBeenCalledOnceWith('example.com', 'https://example.com/page', 'Example Page');

        fakeStore.updateTitle.calls.reset();
        await collection.handleTitleChange(1, 'https://other.com/page', 'Other');
        await collection.handleTitleChange(99, 'https://example.com/page', 'Untracked tab');
        expect(fakeStore.updateTitle).not.toHaveBeenCalled();
    });
});
