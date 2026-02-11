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
/* global RELOADER */

import CookiePromptManagement from './components/cookie-prompt-management';
import { CPMEmbeddedMessaging } from './components/cpm-embedded-messaging';
import MessageRouter from './components/message-router';
import initReloader from './devbuild-reloader';

// FIXME: uncomment for production
import NativeMessaging from './components/native-messaging';
const nativeMessaging = new NativeMessaging('ddgInternalExtension', 'autoconsent', 'com.duckduckgo.macos.browser');

// On Apple, JS console logs don't work in MV3 extensions, so we try to pass them to the native app.
globalThis.addEventListener('error', (event) => {
    nativeMessaging.notify('extensionException', {
        message: `Uncaught error: ${event.error?.message ?? event.message}`,
        stack: event.error?.stack,
    });
});

globalThis.addEventListener('unhandledrejection', (event) => {
    nativeMessaging.notify('extensionException', {
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
    });
});

const cpmMessaging = new CPMEmbeddedMessaging(nativeMessaging);

// MessageRouter sets up browser.runtime.onMessage dispatching from the shared
// message registry. It must be created before components that register handlers.
const messaging = new MessageRouter();

const cpm = new CookiePromptManagement({
    cpmMessaging,
});

/**
 * Components exposed for debugging and native app integration
 * @type {{
 *  messaging: MessageRouter;
 *  cpm: CookiePromptManagement;
 * }}
 */
const components = {
    messaging,
    cpm,
};

console.log(new Date(), 'DuckDuckGo Embedded Extension loaded:', components);
// @ts-ignore
self.components = components;

RELOADER && initReloader();
