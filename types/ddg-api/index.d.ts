/**
 * `chrome.ddg` — the custom extension API that DuckDuckGo-branded Chromium
 * exposes to the bundled extension. Undefined everywhere else: plain Chromium,
 * an unpacked dev build, the integration tests.
 */
declare namespace chrome {
    const ddg:
        | {
              /** Test call, extension -> browser; resolves once the browser has handled it. */
              ping(): Promise<void>;

              /** Test event, browser -> extension. */
              onPong: {
                  addListener(callback: () => void): void;
              };

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

              /**
               * extension -> browser; the internal feedback form's device
               * details. Rejects unless `tabId` shows the form.
               *
               * Optional: a browser older than the method does not define it.
               */
              getInternalFeedbackDeviceInfo?(tabId: number): Promise<Record<string, unknown>>;

              /**
               * extension -> browser; the internal feedback form's attachments.
               * Rejects unless `tabId` shows the form.
               *
               * Optional: a browser older than the method does not define it.
               */
              getInternalFeedbackAttachments?(tabId: number): Promise<Record<string, unknown>>;
          }
        | undefined;
}
