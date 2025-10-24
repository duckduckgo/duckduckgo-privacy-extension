import browser from 'webextension-polyfill';

import surrogatesReference from '@duckduckgo/privacy-reference-tests/request-blocklist/surrogates-reference.txt';
import configReference from '@duckduckgo/privacy-reference-tests/request-blocklist/config-reference.json';
import tdsReference from '@duckduckgo/privacy-reference-tests/request-blocklist/tds-reference.json';
import allowlistReference from '@duckduckgo/privacy-reference-tests/request-blocklist/user-allowlist-reference.json';
import tests from '@duckduckgo/privacy-reference-tests/request-blocklist/tests.json';

import { blockHandleResponse } from '../../../shared/js/background/before-request';
import TabManager from '../../../shared/js/background/tab-manager';
import RequestBlocklist from '../../../shared/js/background/components/request-blocklist';
import tds from '../../../shared/js/background/trackers';
import tdsStorageStub from '../../helpers/tds';

describe('Request Blocklist:', () => {
    beforeAll(async () => {
        spyOn(browser.runtime, 'getManifest').and.callFake(() => ({
            manifest_version: 2,
        }));

        tdsStorageStub.stub({
            config: configReference,
            tds: tdsReference,
        });

        for (const allowlistedDomain of allowlistReference) {
            await TabManager.setList({ list: 'allowlisted', domain: allowlistedDomain, value: true });
        }

        this.components = [new RequestBlocklist()];

        const testLists = [
            {
                name: 'config',
                data: configReference,
            },
            {
                name: 'tds',
                data: tdsReference,
            },
            {
                name: 'surrogates',
                data: surrogatesReference,
            },
        ];
        return tds.setLists(testLists);
    });

    const tabId = 1;
    for (const testSet of Object.values(tests)) {
        describe(testSet.desc + ':', () => {
            for (const { name, requestUrl, requestType, websiteUrl, expectAction: expectedAction, exceptPlatforms } of testSet.tests) {
                if (exceptPlatforms?.includes('web-extension-mv3')) {
                    continue;
                }

                it(name + ':', async () => {
                    const actualResponse = await blockHandleResponse(TabManager.create({ tabId, url: websiteUrl }), {
                        tabId,
                        url: requestUrl,
                        type: requestType,
                    });

                    let actualAction = 'allow';
                    if (actualResponse?.cancel) {
                        actualAction = 'block';
                    } else if (actualResponse?.redirectUrl) {
                        actualAction = 'redirect';
                    }

                    expect(actualAction).toEqual(expectedAction);
                });
            }
        });
    }
});
