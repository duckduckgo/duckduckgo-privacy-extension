/* global DEBUG, RELOADER */
import { onStartup } from './startup';
import TabTracker from './components/tab-tracking';
import TDSStorage from './components/tds';
import ToggleReports from './components/toggle-reports';
import TrackersGlobal from './components/trackers';
import DNRListeners from './components/dnr-listeners';
import RemoteConfig from './components/remote-config';
import DashboardMessaging from './components/dashboard-messaging';
import initReloader from './devbuild-reloader';
import initDebugBuild from './devbuild';
import Devtools from './components/devtools';
import tabManager from './tab-manager';
import MessageRouter from './components/message-router';

// Trigger registration of default message handlers into the shared registry.
import { registerStandardHandlers } from './message-handlers';
registerStandardHandlers();

// NOTE: this needs to be the first thing that's require()d when the extension loads.
// otherwise FF might miss the onInstalled event
require('./events');
const settings = require('./settings');
require('./dnr-config-rulesets');

settings.ready().then(() => {
    onStartup();
});

const remoteConfig = new RemoteConfig({ settings });
const tds = new TDSStorage({ settings, remoteConfig, abnMetrics: null });
const devtools = new Devtools({ tds });
const dashboardMessaging = new DashboardMessaging({ settings, tds, tabManager });

const components = {
    dashboardMessaging,
    tabTracking: new TabTracker({ tabManager, devtools, abnMetrics: undefined }),
    tds,
    toggleReports: new ToggleReports({ dashboardMessaging }),
    trackers: new TrackersGlobal({ tds }),
    devtools,
    remoteConfig,
    messaging: new MessageRouter(),
    dnrListeners: new DNRListeners({ settings, tds }),
};

// @ts-ignore
self.components = components;

// Optional features controlled by build flags.
// If these flags are set to false, the whole function is tree-shaked from the build.
DEBUG && initDebugBuild();
RELOADER && initReloader();
