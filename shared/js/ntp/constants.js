/** Shared by the New Tab Page interop shim and the ntp-messaging component. */

export const NTP_PORT_NAME = 'ntp-windows-interop';

/** runtime.sendMessage key the background uses on startup to ask open pages to reconnect. */
export const NTP_RECONNECT_MESSAGE = 'ntpReconnect';

/** content-scope-scripts special pages messaging context and feature. */
export const NTP_MESSAGING_CONTEXT = 'specialPages';
export const NTP_FEATURE_NAME = 'newTabPage';

/** The page's "other companies" entry, DDG_STATS_OTHER_COMPANY_IDENTIFIER in content-scope-scripts. */
export const NTP_OTHER_COMPANY_IDENTIFIER = '__other__';
