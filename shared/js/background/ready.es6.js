/**
 * Module that exports an API for announcing that, or checking if, a part of the
 * extension's code is ready for use. This helps to avoid circular dependencies
 * that can otherwise result from exporting ready functions directly from each
 * module.
 */

/**
 * @typedef readyResolverResult
 * @property {function} ready
 * @property {function} resolve
 */

/**
 * Create a new ready promise getter and resolver.
 * returns {readyResolverResult}
 */
function createReadyResolver () {
    let readyResolver = null
    const readyPromise = new Promise(resolve => { readyResolver = resolve })

    return {
        ready () { return readyPromise },
        resolve () {
            if (readyResolver) {
                readyResolver()
                readyResolver = null
            }
        }
    }
}

export const {
    ready: startupReady,
    resolve: startupReadyResolve
} = createReadyResolver()
