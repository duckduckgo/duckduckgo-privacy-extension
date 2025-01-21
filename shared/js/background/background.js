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
import FireButton from './components/fire-button';
import TabTracker from './components/tab-tracking';
import MV3ContentScriptInjection from './components/mv3-content-script-injection';
import EmailAutofill from './components/email-autofill';
import OmniboxSearch from './components/omnibox-search';
import InternalUserDetector from './components/internal-user-detector';
import TDSStorage from './components/tds';
import ToggleReports from './components/toggle-reports';
import TrackersGlobal from './components/trackers';
import DebuggerConnection from './components/debugger-connection';
import Devtools from './components/devtools';
import DNRListeners from './components/dnr-listeners';
import RemoteConfig from './components/remote-config';
import initDebugBuild from './devbuild';
import initReloader from './devbuild-reloader';
import tabManager from './tab-manager';
import AbnExperimentMetrics, { AppUseMetric, PixelMetric, SearchMetric } from './components/abn-experiments';
import MessageRouter from './components/message-router';
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
const abnMetrics = BUILD_TARGET !== 'firefox' ? new AbnExperimentMetrics({ remoteConfig }) : null;
const tds = new TDSStorage({ settings, remoteConfig, abnMetrics });
const devtools = new Devtools({ tds });
/**
 * @type {{
 *  autofill: EmailAutofill;
 *  omnibox: OmniboxSearch;
 *  fireButton?: FireButton;
 *  internalUser: InternalUserDetector;
 *  tds: TDSStorage;
 *  tabTracking: TabTracker;
 *  trackers: TrackersGlobal;
 *  remoteConfig: RemoteConfig;
 *  abnMetrics: AbnExperimentMetrics?;
 *  messaging: MessageRouter;
 * }}
 */
const components = {
    autofill: new EmailAutofill({ settings }),
    omnibox: new OmniboxSearch(),
    internalUser: new InternalUserDetector({ settings }),
    tabTracking: new TabTracker({ tabManager, devtools }),
    tds,
    toggleReports: new ToggleReports(),
    trackers: new TrackersGlobal({ tds }),
    debugger: new DebuggerConnection({ tds, devtools }),
    devtools,
    remoteConfig,
    abnMetrics,
    messaging: new MessageRouter({ tabManager })
};

// Chrome-only components
if (BUILD_TARGET === 'chrome' || BUILD_TARGET === 'chrome-mv2') {
    components.metrics = [new AppUseMetric({ abnMetrics }), new SearchMetric({ abnMetrics }), new PixelMetric({ abnMetrics })];
    components.fireButton = new FireButton({ settings, tabManager });
}
// MV3-only components
if (BUILD_TARGET === 'chrome') {
    components.scriptInjection = new MV3ContentScriptInjection();
    components.dnrListeners = new DNRListeners({ settings, tds });
}
console.log(new Date(), 'Loaded components:', components);
// @ts-ignore
self.components = components;

// Optional features controlled by build flags.
// If these flags are set to false, the whole function is tree-shaked from the build.
DEBUG && initDebugBuild();
RELOADER && initReloader();

components.messaging.addEventListener('messageReceived', (ev) => {
    console.log('xxx msg', ev.detail)
})
