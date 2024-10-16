
/**
 * Static accessor for components. For legacy components where we cannot inject the component easily.
 * @param {string} name
 * @returns {Object | null}
 */
export function getComponent (name) {
    if (globalThis.components && globalThis.components[name]) {
        return globalThis.components[name]
    }
    return null
}
