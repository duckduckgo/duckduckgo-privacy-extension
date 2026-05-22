import {
    onNavigationToGoogleAccounts,
    shouldAllowGoogleOAuthCookiesSync,
    cleanupExpiredGoogleOAuthDomains,
} from '../../../shared/js/background/events/google-oauth-detector';
import { getFromSessionStorage, setToSessionStorage, removeFromSessionStorage } from '../../../shared/js/background/wrapper';

const STORAGE_KEY = 'googleOAuthAllowedDomains';

describe('Google OAuth 3p Cookie Heuristic', () => {
    beforeEach(async () => {
        await removeFromSessionStorage(STORAGE_KEY);
    });

    describe('onNavigationToGoogleAccounts', () => {
        it('should add target domain for implicit OAuth flow with ss_domain', async () => {
            const url =
                'https://accounts.google.com/o/oauth2/auth?response_type=permission%20id_token&ss_domain=https%3A%2F%2Fexample.com';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeTruthy();
            expect(allowed['example.com']).toBeTruthy();
            expect(allowed['example.com'].addedAt).toBeGreaterThan(0);
        });

        it('should add target domain for OAuth flow with app_domain', async () => {
            const url =
                'https://accounts.google.com/v3/signin/identifier?response_type=permission%20id_token&app_domain=https%3A%2F%2Fmyapp.io';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeTruthy();
            expect(allowed['myapp.io']).toBeTruthy();
        });

        it('should prefer ss_domain over app_domain', async () => {
            const url =
                'https://accounts.google.com?response_type=permission&ss_domain=https%3A%2F%2Fss.com&app_domain=https%3A%2F%2Fapp.com';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed['ss.com']).toBeTruthy();
            expect(allowed['app.com']).toBeUndefined();
        });

        it('should NOT add domain for authorization code flow', async () => {
            const url =
                'https://accounts.google.com/o/oauth2/auth?response_type=code&ss_domain=https%3A%2F%2Fexample.com';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeFalsy();
        });

        it('should NOT add domain when ss_domain/app_domain is missing', async () => {
            const url = 'https://accounts.google.com/o/oauth2/auth?response_type=permission';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeFalsy();
        });

        it('should NOT trigger for non-accounts.google.com URLs', async () => {
            const url =
                'https://evil.com/o/oauth2/auth?response_type=permission&ss_domain=https%3A%2F%2Fexample.com';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeFalsy();
        });

        it('should handle invalid ss_domain gracefully', async () => {
            const url =
                'https://accounts.google.com/o/oauth2/auth?response_type=permission&ss_domain=not-a-url';
            await onNavigationToGoogleAccounts(url);

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed).toBeFalsy();
        });

        it('should not duplicate entries for same domain', async () => {
            const url =
                'https://accounts.google.com?response_type=permission&ss_domain=https%3A%2F%2Fexample.com';
            await onNavigationToGoogleAccounts(url);
            const allowed1 = await getFromSessionStorage(STORAGE_KEY);
            const timestamp1 = allowed1['example.com'].addedAt;

            await onNavigationToGoogleAccounts(url);
            const allowed2 = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed2['example.com'].addedAt).toBe(timestamp1);
        });
    });

    describe('shouldAllowGoogleOAuthCookiesSync', () => {
        it('should return true for google.com request on allowed site', async () => {
            await onNavigationToGoogleAccounts(
                'https://accounts.google.com?response_type=permission&ss_domain=https%3A%2F%2Fexample.com',
            );

            const result = shouldAllowGoogleOAuthCookiesSync('https://accounts.google.com/cookie-endpoint', 'https://example.com/page');
            expect(result).toBe(true);
        });

        it('should return true for any google.com subdomain request', async () => {
            await onNavigationToGoogleAccounts(
                'https://accounts.google.com?response_type=permission&ss_domain=https%3A%2F%2Fexample.com',
            );

            const result = shouldAllowGoogleOAuthCookiesSync('https://apis.google.com/some/endpoint', 'https://example.com/page');
            expect(result).toBe(true);
        });

        it('should return false for non-google.com request', async () => {
            await onNavigationToGoogleAccounts(
                'https://accounts.google.com?response_type=permission&ss_domain=https%3A%2F%2Fexample.com',
            );

            const result = shouldAllowGoogleOAuthCookiesSync('https://tracker.evil.com/track', 'https://example.com/page');
            expect(result).toBe(false);
        });

        it('should return false for site not in allowed list', () => {
            const result = shouldAllowGoogleOAuthCookiesSync('https://accounts.google.com/endpoint', 'https://notallowed.com/page');
            expect(result).toBe(false);
        });

        it('should return false for expired entries', async () => {
            // Manually write an expired entry
            const expired = {
                'example.com': {
                    addedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago
                    ruleId: null,
                },
            };
            await setToSessionStorage(STORAGE_KEY, expired);
            // Trigger cache refresh
            await cleanupExpiredGoogleOAuthDomains();

            const result = shouldAllowGoogleOAuthCookiesSync('https://accounts.google.com/endpoint', 'https://example.com/page');
            expect(result).toBe(false);
        });

        it('should return false for null/undefined inputs', () => {
            expect(shouldAllowGoogleOAuthCookiesSync(null, 'https://example.com')).toBe(false);
            expect(shouldAllowGoogleOAuthCookiesSync('https://google.com', null)).toBe(false);
            expect(shouldAllowGoogleOAuthCookiesSync(undefined, undefined)).toBe(false);
        });
    });

    describe('cleanupExpiredGoogleOAuthDomains', () => {
        it('should remove expired entries', async () => {
            const data = {
                'expired.com': {
                    addedAt: Date.now() - 6 * 60 * 1000,
                    ruleId: null,
                },
                'valid.com': {
                    addedAt: Date.now(),
                    ruleId: null,
                },
            };
            await setToSessionStorage(STORAGE_KEY, data);

            await cleanupExpiredGoogleOAuthDomains();

            const allowed = await getFromSessionStorage(STORAGE_KEY);
            expect(allowed['expired.com']).toBeUndefined();
            expect(allowed['valid.com']).toBeTruthy();
        });

        it('should handle empty storage gracefully', async () => {
            await cleanupExpiredGoogleOAuthDomains();
            const allowed = await getFromSessionStorage(STORAGE_KEY);
            // Should be null/undefined (never set) or empty
            expect(!allowed || Object.keys(allowed).length === 0).toBe(true);
        });
    });
});
