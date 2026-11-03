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
               * extension -> browser; the favorites the browser shows, in
               * order. `id` is the bookmark's id. Empty until bookmarks load.
               *
               * Optional, with the two below: a browser older than favorites
               * does not define them.
               */
              getFavorites?(): Promise<{ id: string; title: string; url: string }[]>;

              /**
               * extension -> browser; moves favorite `id` to `index`, counted
               * with it taken out. Rejects if `id` is not a favorite.
               */
              moveFavorite?(id: string, index: number): Promise<void>;

              /**
               * extension -> browser; opens the bookmark dialog for adding a
               * favorite over tab `tabId`, which must be its window's active
               * tab. Resolves with whether it opened.
               */
              showAddFavoriteBubble?(tabId: number): Promise<boolean>;

              /**
               * browser -> extension; the favorites may have changed. Not
               * held for a listener that registers late.
               */
              onFavoritesChanged?: {
                  addListener(callback: () => void): void;
              };
          }
        | undefined;
}
