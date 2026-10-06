import browser from 'webextension-polyfill';

const COMMENT_SECTIONS = [
    'ytd-comments',
    '#comments',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]',
];

const RELATED_SECTIONS = ['#related', 'ytd-watch-next-secondary-results-renderer'];

const COMMENTS_NOTE = 'Comments are hidden by OpenFocusd';
const RELATED_NOTE = 'Recommended videos are hidden by OpenFocusd';

// The combinator has to be repeated for every selector. `a, b > *` only
// applies `> *` to `b`, which left the comments visible and put `content` on
// the section element, where it does not render.
function sectionCss(sections, note) {
    const rule = (suffix, declarations) => `${sections.map((selector) => `${selector}${suffix}`).join(',')}{${declarations}}`;
    return [
        rule(' > *', 'display:none !important;'),
        rule(
            '::before',
            [
                `content:"${note}";`,
                'display:block !important;',
                'padding:12px 0 16px !important;',
                'font:14px/1.4 Roboto,Arial,sans-serif !important;',
                'color:var(--yt-spec-text-secondary,#aaa) !important;',
            ].join(''),
        ),
    ].join('');
}

const SHORTS_NOTE = 'Shorts are hidden by OpenFocusd';

const SHORTS_SURFACES = [
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-rich-section-renderer:has(ytd-reel-shelf-renderer)',
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
    'grid-shelf-view-model:has(ytm-shorts-lockup-view-model-v2)',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
    'ytd-reel-item-renderer',
    'ytd-video-renderer:has(a[href^="/shorts/"])',
    'ytd-grid-video-renderer:has(a[href^="/shorts/"])',
    'ytd-rich-item-renderer:has(a[href^="/shorts/"])',
    'ytd-compact-video-renderer:has(a[href^="/shorts/"])',
    'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
    'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
];

function hideElements(selectors) {
    return `${selectors.join(',')}{display:none !important;}`;
}

const THUMBNAIL_SURFACES = [
    'yt-thumbnail-view-model',
    'ytd-thumbnail',
    'ytd-playlist-thumbnail',
    '.ytp-videowall-still',
    '.ytp-videowall-still-image',
];

const COMMENTS_CSS = sectionCss(COMMENT_SECTIONS, COMMENTS_NOTE);
const RELATED_CSS = sectionCss(RELATED_SECTIONS, RELATED_NOTE);
const SHORTS_CSS = [hideElements(SHORTS_SURFACES), sectionCss(['ytd-shorts'], SHORTS_NOTE)].join('');
const THUMBNAILS_CSS = `${THUMBNAIL_SURFACES.join(',')}{filter:blur(20px) !important;}`;

// Earlier builds hid the whole section, which also hides the note above.
const LEGACY_COMMENTS_CSS = [
    'ytd-comments,',
    '#comments,',
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] {',
    'display: none !important;',
    '}',
].join('');

// `a, b > *` only attaches `> *` to `b`. That injected rule set the section
// itself to `display: none`, which hides this note. Remove it from open tabs.
const LEGACY_GROUPED_SELECTOR_CSS = [
    'ytd-comments,#comments,ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] > * {',
    'display: none !important;',
    '}',
    'ytd-comments,#comments,ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]::before {',
    'content: "Comments are hidden by OpenFocusd";',
    'display: block !important;',
    'padding: 12px 0 16px !important;',
    'font: 14px/1.4 Roboto, Arial, sans-serif !important;',
    'color: var(--yt-spec-text-secondary, #606060) !important;',
    '}',
].join('');

const SHEETS = [
    {
        setting: 'hideYoutubeComments',
        css: COMMENTS_CSS,
        legacy: [LEGACY_COMMENTS_CSS, LEGACY_GROUPED_SELECTOR_CSS],
    },
    {
        setting: 'hideYoutubeRecommendations',
        css: RELATED_CSS,
        legacy: [],
    },
    {
        setting: 'hideYoutubeShorts',
        css: SHORTS_CSS,
        legacy: [],
    },
    {
        setting: 'blurYoutubeThumbnails',
        css: THUMBNAILS_CSS,
        legacy: [],
    },
];

const YOUTUBE_TAB_URLS = ['*://*.youtube.com/*', '*://youtube.com/*'];

function isYoutubePage(url) {
    try {
        const { protocol, hostname } = new URL(url);
        if (protocol !== 'https:' && protocol !== 'http:') {
            return false;
        }
        return hostname === 'youtube.com' || hostname.endsWith('.youtube.com');
    } catch (e) {
        return false;
    }
}

export default class SanitizeYoutube {
    /**
     * @param {{ settings: import('../settings.js') }} options
     */
    constructor({ settings }) {
        this.featureName = 'SanitizeYoutube';
        this.settings = settings;
        this.settings.ready().then(() => this.syncOpenTabs());
        for (const sheet of SHEETS) {
            this.settings.onSettingUpdate.addEventListener(sheet.setting, () => {
                this.syncOpenTabs();
            });
        }
        browser.webNavigation.onCommitted.addListener((details) => {
            if (details.frameId !== 0 || !isYoutubePage(details.url)) {
                return;
            }
            this.settings.ready().then(() => {
                this.setTab(details.tabId);
            });
        });
    }

    isEnabled(setting) {
        return this.settings.getSetting(setting) === true;
    }

    async syncOpenTabs() {
        let tabs = [];
        try {
            tabs = await browser.tabs.query({ url: YOUTUBE_TAB_URLS });
        } catch (e) {
            return;
        }
        await Promise.all(
            tabs.map((tab) => {
                if (tab.id == null) {
                    return Promise.resolve();
                }
                return this.setTab(tab.id);
            }),
        );
    }

    async setTab(tabId) {
        await this.clear(tabId);
        await Promise.all(SHEETS.filter((sheet) => this.isEnabled(sheet.setting)).map((sheet) => this.insert(tabId, sheet.css)));
    }

    async insert(tabId, css) {
        try {
            await browser.scripting.insertCSS({ target: { tabId }, css });
        } catch (e) {}
    }

    async clear(tabId) {
        const styles = SHEETS.flatMap((sheet) => [sheet.css, ...sheet.legacy]);
        await Promise.all(
            styles.map(async (css) => {
                try {
                    await browser.scripting.removeCSS({ target: { tabId }, css });
                } catch (e) {}
            }),
        );
    }
}
