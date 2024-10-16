export const components = {}
/**
 * Static accessor for components. For legacy components where we cannot inject the component easily.
 * @param {string} name
 * @returns {Object | null}
 */
export function getComponent (name) {
    if (components[name]) {
        return components[name]
    }
    return null
}

export function registerComponent (name, value) {
    components[name] = value
}
