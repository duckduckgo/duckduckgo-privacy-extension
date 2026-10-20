import browser from 'webextension-polyfill';

const tds = require('../../shared/js/background/trackers');
const tdsStorageStub = require('../helpers/tds');
const tdsStorage = require('../../shared/js/background/storage/tds').default;
const tabManager = require('../../shared/js/background/tab-manager');
const constants = require('../../shared/data/constants');
const { getArgumentsObject } = require('../../shared/js/background/helpers/arguments-object');

describe('getArgumentsObject', () => {
    const url = 'https://example.com/';

    beforeAll(() => {
        tdsStorageStub.stub();
        return tdsStorage.getLists().then((lists) => tds.setLists(lists));
    });

    beforeEach(() => {
        tabManager.delete(1);
        tabManager.create({ tabId: 1, url });
    });

    afterEach(() => {
        tabManager.delete(1);
    });

    it('passes the extension version as the platform version', () => {
        spyOn(browser.runtime, 'getManifest').and.returnValue(/** @type {any} */ ({ version: '2026.10.20' }));

        const args = getArgumentsObject(1, { url, frameId: 0 }, url, 'abc123');

        expect(args?.platform).toEqual({ ...constants.platform, version: '2026.10.20' });
    });

    it('leaves the shared platform constant unchanged', () => {
        spyOn(browser.runtime, 'getManifest').and.returnValue(/** @type {any} */ ({ version: '2026.10.20' }));

        getArgumentsObject(1, { url, frameId: 0 }, url, 'abc123');

        expect(constants.platform).not.toEqual(jasmine.objectContaining({ version: jasmine.anything() }));
    });
});
