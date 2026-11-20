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
               * extension -> browser; the New Tab Page's choices, for its page
               * in tab `tabId`, which are the ones duck://settings makes. This
               * and the New Tab Page calls below reject, changing nothing,
               * unless the tab shows the New Tab Page, and throw for arguments
               * the browser's schema does not accept.
               */
              getNewTabPageSettings(tabId: number): Promise<ddg.NewTabPageSettings>;

              /**
               * extension -> browser; whether the page in tab `tabId` should
               * open its customize panel, as it should when duck://settings'
               * link opened it. Answered the same while the tab shows it.
               */
              isNewTabPageCustomizerRequested(tabId: number): Promise<boolean>;

              /** extension -> browser; sets the browser color scheme. */
              setNewTabPageTheme(tabId: number, theme: ddg.NewTabPageTheme): Promise<void>;

              /**
               * extension -> browser; shows or hides the Sections `sections`
               * names, as one change.
               */
              setNewTabPageSections(tabId: number, sections: ddg.NewTabPageSectionsChange): Promise<void>;

              /** extension -> browser; sets whether the search box offers Duck.ai. */
              setNewTabPageDuckAiInSearch(tabId: number, enabled: boolean): Promise<void>;

              /**
               * browser -> extension; the favorites may have changed. Not
               * held for a listener that registers late.
               */
              onFavoritesChanged: {
                  addListener(callback: () => void): void;
              };
          }
        | undefined;

    namespace ddg {
        /** The New Tab Page's theme: the browser color scheme. */
        type NewTabPageTheme = 'light' | 'dark' | 'system';

        /** Which of the New Tab Page's widgets are shown: its Sections. */
        interface NewTabPageSections {
            /** The search box. */
            search: boolean;
            favorites: boolean;
            /** The protections report. */
            protections: boolean;
        }

        /** A change to some of the Sections. Those left out stay as they are. */
        type NewTabPageSectionsChange = Partial<NewTabPageSections>;

        interface NewTabPageSettings {
            theme: NewTabPageTheme;
            sections: NewTabPageSections;
            /** Whether the search box offers Duck.ai. */
            duckAiInSearch: boolean;
        }
    }
}
