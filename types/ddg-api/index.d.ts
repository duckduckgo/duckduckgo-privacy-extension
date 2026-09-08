/**
 * `chrome.ddg` — the custom extension API that DuckDuckGo-branded Chromium
 * exposes to component extensions.
 *
 * Possibly undefined: the API is gated on `"location": "component"`, so it is
 * absent in plain Chromium, in a dev-loaded unpacked build, and in the
 * integration tests. Only the parts this extension uses are declared here.
 */
declare namespace chrome {
    const ddg:
        | {
              /** extension -> browser; resolves with the browser's reply. */
              send(message: unknown): Promise<any>;

              /**
               * browser -> extension; fires once when a burn is accepted,
               * before it destroys anything. No reply channel, and the burn
               * does not wait for listeners.
               *
               * Optional: a browser older than the event does not define it.
               */
              onBurnStarted?: {
                  addListener(callback: (details: { trigger: 'in-session' | 'on-exit' | 'on-startup' }) => void): void;
              };
          }
        | undefined;
}
