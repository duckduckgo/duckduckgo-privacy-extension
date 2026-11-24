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
               */
              getFavorites(): Promise<{ id: string; title: string; url: string }[]>;

              /**
               * extension -> browser; moves favorite `id` to `index`, counted
               * with it taken out. Rejects if `id` is not a favorite.
               */
              moveFavorite(id: string, index: number): Promise<void>;

              /**
               * extension -> browser; opens the bookmark dialog for adding a
               * favorite over tab `tabId`. Resolves with whether it opened,
               * which it does only over its window's active tab.
               */
              showAddFavoriteBubble(tabId: number): Promise<boolean>;

              /**
               * extension -> browser; makes the newest bookmark of `url` in
               * the bookmarks bar a favorite, unless one already is, first
               * adding one titled `title` at the end of the bar if there is
               * none. Rejects, changing nothing, unless `url` is a valid
               * http(s) URL and bookmarks have loaded.
               */
              addFavorite(url: string, title: string): Promise<void>;

              /**
               * extension -> browser; unfavorites the favorites with `url`.
               * Their bookmarks stay. Rejects before bookmarks load.
               */
              removeFavorite(url: string): Promise<void>;

              /**
               * extension -> browser; shows `items` as a menu at the mouse
               * pointer over tab `tabId`. Once it closes, resolves with the id
               * of the item chosen, or undefined if none was or it did not
               * open, which it does only over its window's active tab.
               */
              showContextMenu(tabId: number, items: { id: string; title: string; checked: boolean }[]): Promise<string | undefined>;

              /**
               * extension -> browser; whether the New Tab Page in tab `tabId`
               * should open its customize panel, as it should when
               * duck://settings' link opened it. Answered the same while the
               * tab shows it. Rejects unless the tab shows the New Tab Page.
               */
              isNewTabPageCustomizerRequested(tabId: number): Promise<boolean>;

              /**
               * browser -> extension; the favorites may have changed. Not
               * held for a listener that registers late.
               */
              onFavoritesChanged: {
                  addListener(callback: () => void): void;
              };
          }
        | undefined;

    /**
     * `chrome.settingsPrivate`: the browser's prefs, which DuckDuckGo-branded
     * Chromium lets the bundled extension read and set for the few it shares
     * with it, such as the New Tab Page's choices. Undefined everywhere else.
     */
    const settingsPrivate:
        | {
              /** The pref `name`. Rejects for a pref the browser does not share. */
              getPref(name: string): Promise<settingsPrivate.PrefObject>;

              /**
               * Sets the pref `name`. Resolves with whether it was set: not for
               * a pref the browser does not share, or a value of the wrong type.
               */
              setPref(name: string, value: unknown): Promise<boolean>;

              /**
               * browser -> extension; prefs that changed, wherever the change
               * was made, one event per pref. Wakes the worker.
               */
              onPrefsChanged: {
                  addListener(callback: (prefs: settingsPrivate.PrefObject[]) => void): void;
              };
          }
        | undefined;

    namespace settingsPrivate {
        interface PrefObject {
            key: string;
            type: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'URL' | 'LIST' | 'DICTIONARY';
            value: unknown;
        }
    }
}
