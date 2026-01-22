/*
 * Copyright (C) 2012, 2016 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * This is a stripped-down version of the extension for embedding in native apps.
 * Much of the functionality is offloaded to the native app.
 */
/* global RELOADER, DEBUG */

import RemoteConfigEmbedded from './components/remote-config-embedded';
import CookiePromptManagement from './components/cookie-prompt-management';
import initReloader from './devbuild-reloader';
import NativeMessaging from './components/native-messaging';
// FIXME: THIS IS ONLY ADDED FOR TESTING, REMOVE BEFORE MERGING
import bundledConfig from '../../data/bundled/macos-config.json';
const settings = require('./settings');

/**
 * Mock implementation of NativeMessaging for testing while native side is not ready.
 */
class NativeMessagingMock extends NativeMessaging {
    async request(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] request', method, params);
        let response = {};
        switch (method) {
            case 'getPrivacyConfigIfNew':
                if (params.version && params.version === `${bundledConfig.version}`) {
                    response = {
                        status: 'success',
                        data: { updated: false },
                    };
                } else {
                    response = {
                        status: 'success',
                        data: { updated: true, data: bundledConfig, version: `${bundledConfig.version}` },
                    };
                }
                break;
            default:
                throw new Error(`[NativeMessaging] request: unknown method ${method}`);
        }
        DEBUG && console.log('[NativeMessaging] response', response);
        return response;
    }

    /**
     * Send a fire-and-forget notification.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    notify(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] notify', method, params);
        // no-op
    }
}

const nativeMessaging = new NativeMessagingMock();
const remoteConfig = new RemoteConfigEmbedded({ nativeMessaging, settings });
// trigger config refresh
// eslint-disable-next-line no-unused-expressions
remoteConfig.ready;

const cpm = new CookiePromptManagement({
    remoteConfig,
    nativeMessaging,
    settings,
});

/**
 * Components exposed for debugging and native app integration
 * @type {{
 *  nativeMessaging: NativeMessaging;
 *  remoteConfig: RemoteConfigEmbedded;
 *  cpm: CookiePromptManagement;
 * }}
 */
const components = {
    nativeMessaging,
    remoteConfig,
    cpm,
};

console.log(new Date(), 'DuckDuckGo Embedded Extension loaded:', components);
// @ts-ignore
self.components = components;


RELOADER && initReloader();
