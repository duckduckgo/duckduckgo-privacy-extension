import { isMessageBridgeFeatureAllowed } from '../../shared/js/background/components/injected-messaging';

describe('isMessageBridgeFeatureAllowed', () => {
    it('allows a feature on its domains and their subdomains', () => {
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://duck.ai/chat')).toBeTrue();
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://duckduckgo.com/?q=test')).toBeTrue();
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://www.duckduckgo.com/')).toBeTrue();
    });

    it('refuses a feature on other domains, including lookalikes', () => {
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://example.com/')).toBeFalse();
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://notduckduckgo.com/')).toBeFalse();
        expect(isMessageBridgeFeatureAllowed('aiChat', 'https://duckduckgo.com.example.com/')).toBeFalse();
        expect(isMessageBridgeFeatureAllowed('internalFeedback', 'https://duckduckgo.com/')).toBeFalse();
    });

    it('refuses unknown features and missing or invalid URLs', () => {
        expect(isMessageBridgeFeatureAllowed('unknownFeature', 'https://duck.ai/')).toBeFalse();
        expect(isMessageBridgeFeatureAllowed('aiChat', undefined)).toBeFalse();
        expect(isMessageBridgeFeatureAllowed('aiChat', 'not a url')).toBeFalse();
    });
});
