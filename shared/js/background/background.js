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
/* global DEBUG, RELOADER, BUILD_TARGET */

import { onStartup } from './startup';
import TabTracker from './components/tab-tracking';
import MV3ContentScriptInjection from './components/mv3-content-script-injection';
import InternalUserDetector from './components/internal-user-detector';
import TDSStorage from './components/tds';
import ToggleReports from './components/toggle-reports';
import TrackersGlobal from './components/trackers';
import DebuggerConnection from './components/debugger-connection';
import Devtools from './components/devtools';
import DNRListeners from './components/dnr-listeners';
import SiteGroups from './components/site-groups';
import AllowedSites from './components/allowed-sites';
import Sanctuary from './components/sanctuary';
import SanitizeYoutube from './components/sanitize-youtube';
import RemoteConfig from './components/remote-config';
import DashboardMessaging from './components/dashboard-messaging';
import initDebugBuild from './devbuild';
import initReloader from './devbuild-reloader';
import tabManager from './tab-manager';
import MessageRouter from './components/message-router';
import RequestBlocklist from './components/request-blocklist';
import { CPMStandaloneMessaging } from './components/cpm-standalone-messaging';
import CookiePromptManagement from './components/cookie-prompt-management';

// Trigger registration of default message handlers into the shared registry.
import { registerStandardHandlers } from './message-handlers';
registerStandardHandlers();

// NOTE: this needs to be the first thing that's require()d when the extension loads.
// otherwise FF might miss the onInstalled event
require('./events');
const settings = require('./settings');
if (BUILD_TARGET === 'chrome') {
    require('./dnr-config-rulesets');
}

settings.ready().then(() => {
    onStartup();
});

const remoteConfig = new RemoteConfig({ settings });
const tds = new TDSStorage({ settings, remoteConfig });
const devtools = new Devtools({ tds });
const dashboardMessaging = new DashboardMessaging({ settings, tds, tabManager });
/**
 * @type {{
 *  dashboardMessaging: DashboardMessaging
 *  internalUser: InternalUserDetector;
 *  tds: TDSStorage;
 *  tabTracking: TabTracker;
 *  toggleReports: ToggleReports;
 *  trackers: TrackersGlobal;
 *  remoteConfig: RemoteConfig;
 *  messaging: MessageRouter;
 * }}
 */
const components = {
    dashboardMessaging,
    internalUser: new InternalUserDetector({ settings }),
    tabTracking: new TabTracker({ tabManager, devtools }),
    tds,
    toggleReports: new ToggleReports({ dashboardMessaging }),
    trackers: new TrackersGlobal({ tds }),
    debugger: new DebuggerConnection({ tds, devtools }),
    devtools,
    remoteConfig,
    messaging: new MessageRouter(),
};

if (BUILD_TARGET === 'chrome') {
    // MV3-only components
    components.scriptInjection = new MV3ContentScriptInjection();
    try {
        components.siteGroups = new SiteGroups({ settings });
    } catch (error) {
        console.error('Failed to start site groups', error);
    }
    try {
        components.allowedSites = new AllowedSites({ settings });
    } catch (error) {
        console.error('Failed to start allowed sites', error);
    }
    try {
        components.sanctuary = new Sanctuary({ settings });
    } catch (error) {
        console.error('Failed to start sanctuary', error);
    }
    try {
        components.sanitizeYoutube = new SanitizeYoutube({ settings });
    } catch (error) {
        console.error('Failed to start sanitize youtube', error);
    }
    components.dnrListeners = new DNRListeners({ settings, tds });

    const cpmMessaging = new CPMStandaloneMessaging({ remoteConfig });
    components.cpm = new CookiePromptManagement({ cpmMessaging });
} else {
    // MV2-only components
    components.requestBlocklist = new RequestBlocklist();
}
console.log(new Date(), 'Loaded components:', components);
// @ts-ignore
self.components = components;

// Optional features controlled by build flags.
// If these flags are set to false, the whole function is tree-shaked from the build.
DEBUG && initDebugBuild();
RELOADER && initReloader();
