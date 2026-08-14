import {
    SEARCH_ENGINE_BRAVE,
    SEARCH_ENGINE_DDG,
    SEARCH_PLACEHOLDER_BRAVE,
    SEARCH_PLACEHOLDER_DDG,
    buildSearchUrl,
    normalizeSearchEngine,
    searchPlaceholder,
} from '../../shared/js/shared-utils/search-engine';

describe('search engine helpers', () => {
    it('defaults unknown values to DuckDuckGo', () => {
        expect(normalizeSearchEngine(undefined)).toEqual(SEARCH_ENGINE_DDG);
        expect(normalizeSearchEngine('ddg')).toEqual(SEARCH_ENGINE_DDG);
        expect(normalizeSearchEngine('brave')).toEqual(SEARCH_ENGINE_BRAVE);
        expect(normalizeSearchEngine('google')).toEqual(SEARCH_ENGINE_DDG);
    });

    it('uses the matching search placeholder', () => {
        expect(searchPlaceholder(SEARCH_ENGINE_DDG)).toEqual(SEARCH_PLACEHOLDER_DDG);
        expect(searchPlaceholder(SEARCH_ENGINE_BRAVE)).toEqual(SEARCH_PLACEHOLDER_BRAVE);
    });

    it('builds DuckDuckGo and Brave search URLs', () => {
        expect(buildSearchUrl('privacy tools', SEARCH_ENGINE_DDG, { osName: 'Mac', bextSuffix: 'cr' })).toEqual(
            'https://duckduckgo.com/?q=privacy+tools&bext=Maccr',
        );
        expect(buildSearchUrl('privacy tools', SEARCH_ENGINE_BRAVE)).toEqual('https://search.brave.com/search?q=privacy+tools');
    });
});
