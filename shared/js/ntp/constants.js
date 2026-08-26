/**
 * Constants shared between the New Tab Page interop shim (page side) and the
 * ntp-messaging background component.
 */

/** Runtime port used to bridge NTP messaging to the background. */
export const NTP_PORT_NAME = 'ntp-windows-interop';

/** `context` used by content-scope-scripts special pages messaging. */
export const NTP_MESSAGING_CONTEXT = 'specialPages';

/** `featureName` used by the New Tab Page. */
export const NTP_FEATURE_NAME = 'newTabPage';

/**
 * Identifier the New Tab Page uses for the aggregated "other companies"
 * entry. Matches DDG_STATS_OTHER_COMPANY_IDENTIFIER in content-scope-scripts.
 */
export const NTP_OTHER_COMPANY_IDENTIFIER = '__other__';
