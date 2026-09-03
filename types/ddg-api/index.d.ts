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
 * uses are declared here — add the rest when something uses them.
 */
declare namespace chrome {
    const ddg:
        | {
              /** extension -> browser; resolves with the browser's reply. */
              send(message: unknown): Promise<any>;
              /**
               * browser -> extension, fire and forget. Delivery wakes a sleeping
               * service worker, so a listener added at the top level of the worker
               * still receives these after it has been shut down. There is no
               * reply channel: the browser cannot tell that we handled one.
               */
              onMessage: {
                  addListener(listener: (message: any) => void): void;
                  removeListener(listener: (message: any) => void): void;
              };
          }
        | undefined;
}
