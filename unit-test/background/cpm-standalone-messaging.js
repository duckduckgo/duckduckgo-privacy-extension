import { CPMStandaloneMessaging } from '../../shared/js/background/components/cpm-standalone-messaging';
import RemoteConfig from '../../shared/js/background/components/remote-config';
import messageHandlers from '../../shared/js/background/message-registry';
import load from '../../shared/js/background/load';
import tdsStorageStub from '../helpers/tds';
import loadHelper from '../helpers/utils';
import tdsStorage from '../../shared/js/background/storage/tds';
import { MockSettings } from '../helpers/mocks';

const baseConfig = require('../data/extension-config.json');

/**
 * Creates a config with autoconsent enabled and optional subfeatures.
 */
function makeConfigWithAutoconsent(subfeatures = {}) {
    const config = JSON.parse(JSON.stringify(baseConfig));
    config.features.autoconsent = {
        state: 'enabled',
        exceptions: [],
        features: subfeatures,
    };
    return config;
}

function constructMockComponents(config) {
    // clear message handlers to prevent conflict when registering
    Object.keys(messageHandlers).forEach((k) => delete messageHandlers[k]);
    const settings = new MockSettings();
    const remoteConfig = new RemoteConfig({ settings });
    // Prevent the constructor's async checkForUpdates() from overwriting the
    // test config via the onUpdate callback (race with DB/network loads).
    remoteConfig.ready = Promise.resolve();
    remoteConfig.updateConfig(config);
    return { remoteConfig, settings };
}

describe('CPMStandaloneMessaging', () => {
    let messaging;
    let remoteConfig;
    let settings;
    let loadUrlSpy;

    beforeAll(() => {
        const config = makeConfigWithAutoconsent();
        loadHelper.loadStub({ config });
        tdsStorageStub.stub({ config });
        return tdsStorage.getLists();
    });

    beforeEach(() => {
        const config = makeConfigWithAutoconsent({
            enabledSubfeature: {
                state: 'enabled',
            },
            disabledSubfeature: {
                state: 'disabled',
            },
        });
        const components = constructMockComponents(config);
        remoteConfig = components.remoteConfig;
        settings = components.settings;
        messaging = new CPMStandaloneMessaging({ remoteConfig });
        loadUrlSpy = spyOn(load, 'url').and.returnValue(Promise.resolve());
        // Site.isFeatureEnabled reads from the global tdsStorage.config
        tdsStorage.config = config;
    });

    describe('logMessage', () => {
        it('logs the message to console', async () => {
            spyOn(console, 'log');
            await messaging.logMessage('test message');
            expect(console.log).toHaveBeenCalledWith('test message');
        });
    });

    describe('checkAutoconsentSettingEnabled', () => {
        it('always returns true', async () => {
            const result = await messaging.checkAutoconsentSettingEnabled();
            expect(result).toBeTrue();
        });
    });

    describe('checkAutoconsentEnabledForSite', () => {
        it('returns true when autoconsent is enabled for the site', async () => {
            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeTrue();
        });

        it('returns false when the site is in the autoconsent exceptions list', async () => {
            // Update config with an exception for example.com
            const config = makeConfigWithAutoconsent();
            config.features.autoconsent.exceptions = [{ domain: 'example.com' }];
            remoteConfig.updateConfig(config);
            tdsStorage.config = config;

            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeFalse();
        });

        it('returns false when autoconsent feature is disabled', async () => {
            const config = JSON.parse(JSON.stringify(baseConfig));
            config.features.autoconsent = {
                state: 'disabled',
                exceptions: [],
                features: {},
            };
            remoteConfig.updateConfig(config);
            tdsStorage.config = config;

            const result = await messaging.checkAutoconsentEnabledForSite('https://example.com');
            expect(result).toBeFalse();
        });
    });

    describe('checkSubfeatureEnabled', () => {
        it('returns true when the subfeature is enabled', async () => {
            const result = await messaging.checkSubfeatureEnabled('enabledSubfeature');
            expect(result).toBeTrue();
        });

        it('returns false when the subfeature is disabled', async () => {
            const result = await messaging.checkSubfeatureEnabled('disabledSubfeature');
            expect(result).toBeFalse();
        });

        it('returns false for a non-existent subfeature', async () => {
            const result = await messaging.checkSubfeatureEnabled('nonExistent');
            expect(result).toBeFalse();
        });
    });

    describe('sendPixel', () => {
        it('fires a pixel request for a non-daily type', async () => {
            await messaging.sendPixel('someAutoconsentPixel', 'standard', { foo: 'bar' });
            expect(loadUrlSpy).toHaveBeenCalledTimes(1);
            // sendPixelRequest constructs a URL from the pixel name
            expect(loadUrlSpy.calls.mostRecent().args[0]).toContain('someAutoconsentPixel');
        });

        it('fires a daily pixel with _daily suffix', async () => {
            await messaging.sendPixel('someAutoconsentPixel', 'daily', { foo: 'bar' });
            expect(loadUrlSpy).toHaveBeenCalledTimes(1);
            expect(loadUrlSpy.calls.mostRecent().args[0]).toContain('someAutoconsentPixel_daily');
        });

        it('does not fire a daily pixel more than once within 24 hours', async () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2025, 1, 1, 12, 0, 0));

            await messaging.sendPixel('someAutoconsentPixel', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(1);

            // Second call within 24 hours should be suppressed
            jasmine.clock().tick(1000 * 60 * 60 * 12); // 12 hours
            await messaging.sendPixel('someAutoconsentPixel', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(1);

            jasmine.clock().uninstall();
        });

        it('fires a daily pixel again after 24 hours', async () => {
            jasmine.clock().install();
            jasmine.clock().mockDate(new Date(2025, 1, 1, 12, 0, 0));

            await messaging.sendPixel('someAutoconsentPixel', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(1);

            // Advance past 24 hours
            jasmine.clock().tick(1000 * 60 * 60 * 25); // 25 hours
            await messaging.sendPixel('someAutoconsentPixel', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(2);

            jasmine.clock().uninstall();
        });

        it('tracks different daily pixels independently', async () => {
            await messaging.sendPixel('pixel_a', 'daily', {});
            await messaging.sendPixel('pixel_b', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(2);

            // Both should be suppressed on second call
            await messaging.sendPixel('pixel_a', 'daily', {});
            await messaging.sendPixel('pixel_b', 'daily', {});
            expect(loadUrlSpy).toHaveBeenCalledTimes(2);
        });

        it('persists daily pixel timestamps in settings', async () => {
            await messaging.sendPixel('someAutoconsentPixel', 'daily', {});
            const lastSent = settings.getSetting('pixelsLastSent');
            expect(lastSent).toBeDefined();
            expect(lastSent.someAutoconsentPixel_daily).toBeDefined();
            expect(typeof lastSent.someAutoconsentPixel_daily).toBe('number');
        });
    });

    describe('refreshRemoteConfig', () => {
        it('waits for remoteConfig.ready and returns the config', async () => {
            spyOn(remoteConfig, 'checkForUpdates').and.returnValue(Promise.resolve());
            const result = await messaging.refreshRemoteConfig();
            expect(remoteConfig.checkForUpdates).toHaveBeenCalledWith(false);
            expect(result).toEqual(remoteConfig.config);
        });
    });
});
