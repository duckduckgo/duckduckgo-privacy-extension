import browser from 'webextension-polyfill';

import { blockHandleResponse, emitter, TrackerBlockedEvent } from '../../shared/js/background/before-request';
import tabManager from '../../shared/js/background/tab-manager';
import Companies from '../../shared/js/background/companies';
import ServiceWorkerTab from '../../shared/js/background/classes/sw-tab';
import { TabState } from '../../shared/js/background/classes/tab-state';
import tds from '../../shared/js/background/trackers';
import tdsStorage from '../../shared/js/background/storage/tds';
import tdsStorageStub from '../helpers/tds';

const tabId = 4321;

describe('Incognito tabs', () => {
    beforeEach(async () => {
        spyOn(browser.runtime, 'getManifest').and.callFake(() => ({
            manifest_version: 2,
            version: '2099.1.1',
        }));
        tdsStorageStub.stub();
        await tds.setLists(await tdsStorage.getLists());
    });

    afterEach(async () => {
        tabManager.delete(tabId);
        await TabState.done();
    });

    describe('incognito flag', () => {
        it('defaults to false when the tab data does not include it', () => {
            const tab = tabManager.create({ tabId, url: 'https://example.com/' });
            expect(tab.incognito).toBe(false);
        });

        it('is taken from tabs API tab objects', () => {
            const tab = tabManager.create({ id: tabId, url: 'https://example.com/', incognito: true });
            expect(tab.incognito).toBe(true);
        });

        it('is carried over when a navigation replaces the tab', () => {
            tabManager.create({ id: tabId, url: 'https://example.com/', incognito: true });
            const newTab = tabManager.create({ tabId, url: 'https://example.org/' });
            expect(newTab.incognito).toBe(true);
        });

        it('cannot be cleared once set', () => {
            const tab = tabManager.create({ id: tabId, url: 'https://example.com/', incognito: true });
            tab.incognito = false;
            expect(tab.incognito).toBe(true);
        });

        it('is set on an existing tab by createOrUpdateTab', () => {
            tabManager.create({ tabId, url: 'https://example.com/' });
            const tab = tabManager.createOrUpdateTab(tabId, { status: 'loading', incognito: true });
            expect(tab.incognito).toBe(true);
        });

        it('is set when createOrUpdateTab creates the tab', () => {
            const tab = tabManager.createOrUpdateTab(tabId, { status: 'loading', incognito: true });
            expect(tab.incognito).toBe(true);
        });

        it('survives a restore from session storage', async () => {
            tabManager.create({ id: tabId, url: 'https://example.com/', incognito: true });
            await TabState.done();
            delete tabManager.tabContainer[tabId];
            const restored = await tabManager.getOrRestoreTab(tabId);
            expect(restored.incognito).toBe(true);
        });

        it('is set on a restored tab from the tab passed to restoreOrCreate', async () => {
            tabManager.create({ tabId, url: 'https://example.com/' });
            await TabState.done();
            delete tabManager.tabContainer[tabId];
            await tabManager.restoreOrCreate({ id: tabId, url: 'https://example.com/', incognito: true });
            expect(tabManager.get({ tabId }).incognito).toBe(true);
        });
    });

    describe('ServiceWorkerTab', () => {
        it('is incognito if any tab with the same origin is incognito', () => {
            const tabContainer = {
                1: tabManager.create({ id: tabId, url: 'https://example.com/', incognito: false }),
            };
            const swTab = new ServiceWorkerTab('https://example.com/sw.js', tabContainer);
            expect(swTab.incognito).toBe(false);

            tabContainer[2] = { url: 'https://example.com/other', incognito: true };
            expect(swTab.incognito).toBe(true);
        });
    });

    describe('tracker stats', () => {
        const trackerRequest = { tabId, url: 'https://google-analytics.com/analytics.js', type: 'script' };
        let blockedEvents;
        const onBlocked = (event) => blockedEvents.push(event);

        beforeEach(() => {
            blockedEvents = [];
            emitter.on(TrackerBlockedEvent.eventName, onBlocked);
            spyOn(Companies, 'add');
            spyOn(Companies, 'countCompanyOnPage');
        });

        afterEach(() => {
            emitter.off(TrackerBlockedEvent.eventName, onBlocked);
        });

        for (const incognito of [false, true]) {
            const recorded = !incognito;

            it(`blocks trackers and ${recorded ? 'records' : 'does not record'} them when incognito is ${incognito}`, () => {
                const tab = tabManager.create({ id: tabId, url: 'https://example.com/', incognito });
                const response = blockHandleResponse(tab, trackerRequest);
                expect(response?.cancel).toBe(true);
                expect(Companies.add).toHaveBeenCalledTimes(recorded ? 1 : 0);
                expect(Companies.countCompanyOnPage).toHaveBeenCalledTimes(recorded ? 1 : 0);
                expect(blockedEvents.length).toBe(recorded ? 1 : 0);
                // The tab's own tracker list is always updated for the dashboard
                expect(Object.keys(tab.trackers).length).toBe(1);
            });

            it(`${recorded ? 'counts' : 'does not count'} page loads when incognito is ${incognito}`, () => {
                spyOn(Companies, 'incrementTotalPages');
                const tab = tabManager.create({ id: tabId, url: 'https://example.com/', incognito });
                tab.statusCode = 200;
                tabManager.createOrUpdateTab(tabId, { status: 'complete' });
                expect(Companies.incrementTotalPages).toHaveBeenCalledTimes(recorded ? 1 : 0);
            });
        }
    });
});
