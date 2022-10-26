/**
 * Module that exports an API for announcing that, or checking if, a part of the
 * extension's code is ready for use. This helps to avoid circular dependencies
 * that can otherwise result from exporting ready functions directly from each
 * module.
 */

class ReadyResolver {
    constructor () {
        /** @type {function|null} */
        this._readyResolver = null

        this._readyPromise = new Promise(
            resolve => { this._readyResolver = resolve }
        )
    }

    /**
     * Returns a Promise which will resolve when the corresponding code-path is
     * ready for use.
     * @returns {Promise<>}
     */
    ready () { return this._readyPromise }

    /**
     * Resolves the Promise for the corresponding code-path, if it hasn't
     * already been resolved.
     */
    resolve () {
        if (this._readyResolver) {
            this._readyResolver()
            this._readyResolver = null
        }
    }
}

export const startupReady = new ReadyResolver()
