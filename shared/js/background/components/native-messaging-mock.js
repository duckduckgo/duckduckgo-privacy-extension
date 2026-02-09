// FIXME: THIS IS ONLY ADDED FOR TESTING, REMOVE BEFORE MERGING
import bundledConfig from '../../../data/bundled/macos-config.json';

/* global DEBUG */

/**
 * @typedef {import('./native-messaging').NativeMessagingInterface} NativeMessagingInterface
 */

/**
 * Mock implementation of NativeMessaging for testing while native side is not ready.
 * @implements {NativeMessagingInterface}
 */
export class NativeMessagingMock {
    async request(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] request', method, params);
        let response = {};
        switch (method) {
            case 'getResourceIfNew':
                if (params.version && params.version === `${bundledConfig.version}`) {
                    response = {
                        updated: false,
                    };
                } else {
                    response = {
                        updated: true,
                        data: bundledConfig,
                        version: `${bundledConfig.version}`,
                    };
                }
                break;
            case 'isFeatureEnabled':
                response = {
                    enabled: true,
                };
                break;
            case 'isSubFeatureEnabled':
                response = {
                    enabled: true,
                };
                break;
            case 'sendPixel':
                response = {
                    success: true,
                };
                break;
            default:
                throw new Error(`[NativeMessaging] request: unknown method ${method}`);
        }
        DEBUG && console.log('[NativeMessaging] response', response);
        return response;
    }

    /**
     * Send a fire-and-forget notification.
     *
     * @param {string} method - The method name to call on the native side
     * @param {Record<string, any>} [params] - Optional parameters to send
     */
    notify(method, params = {}) {
        DEBUG && console.log('[NativeMessaging] notify', method, params);
        // no-op
    }

    subscribe(_msg, _callback) {
        throw new Error('[NativeMessaging] subscribe: not supported');
    }
}
