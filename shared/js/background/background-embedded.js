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
/* global RELOADER, BUILD_TARGET */

import RemoteConfigEmbedded from './components/remote-config-embedded';
import CookiePromptManagement from './components/cookie-prompt-management';
import initReloader from './devbuild-reloader';
import NativeMessaging from './components/native-messaging';
const settings = require('./settings');

const nativeMessaging = new NativeMessaging();
const remoteConfig = new RemoteConfigEmbedded({ nativeMessaging, settings });
// trigger config refresh
// eslint-disable-next-line no-unused-expressions
remoteConfig.ready;

const cpm = new CookiePromptManagement({
    remoteConfig,
});

/**
 * Components exposed for debugging and native app integration
 * @type {{
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
