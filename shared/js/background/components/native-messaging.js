/**
 * TODO: Replace this mock with actual native messaging implementation.
 * Native messaging interface for communicating with the native app.
 * @type {NativeMessaging}
 */
export default class NativeMessaging {
    /**
     * @param {string} name
     * @param {object} payload
     * @returns {Promise<object>}
     */
    async request(name, payload) {
        console.log(`nativeMessaging: request called for ${name}`);
        // TODO: Implement actual native messaging call
        throw new Error(`Native messaging not implemented for ${name}`);
    }

    /**
     * @param {string} name
     * @param {object} payload
     * @returns {Promise<void>}
     */
    async notify(name, payload) {
        console.log(`nativeMessaging: notify called for ${name}`);
        // TODO: Implement actual native messaging notification
        throw new Error(`Native messaging not implemented for ${name}`);
    }
}
