/**
 * `chrome.ddg` — the custom extension API that DuckDuckGo-branded Chromium
 * exposes to component extensions.
 *
 * Typed as possibly undefined because that is the truth: the API is gated on
 * `"location": "component"`, so it is absent in plain Chromium, in a
 * dev-loaded unpacked build, and in the integration tests. Callers must check
 * before using it.
 *
 * The contract lives in the chromium fork at
 * `chrome/common/extensions/api/ddg.webidl`. Only the parts this extension
 * uses are declared here — add the events when something listens for them.
 */
declare namespace chrome {
    const ddg:
        | {
              /** extension -> browser; resolves with the browser's reply. */
              send(message: unknown): Promise<any>;
          }
        | undefined;
}
