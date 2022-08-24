export class LegacyTabTransfer {
    /**
     * @param {import('./tab.es6')} tab
     */
    constructor (tab) {
        const clonedTab = cloneObject(tab)
        const entries = Object.entries(clonedTab)
        for (const [key, value] of entries) {
            this[key] = value
        }
    }
}

function isPrimative (value) {
    return Array.isArray(value) || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined
}

function cloneObject (object) {
    const out = {}
    for (const key of Object.keys(object)) {
        const value = object[key]
        // Ignore 'private' keys
        if (key.startsWith('_')) {
            continue
        }
        if (isPrimative(value)) {
            out[key] = structuredClone(value)
        } else {
            out[key] = cloneObject(value)
        }
    }
    if (Object.getPrototypeOf(object) !== Object.getPrototypeOf({})) {
        // Clone getter values
        for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(object))) {
            if (key === 'constructor') {
                continue
            }
            const value = object[key]
            if (typeof value !== 'function') {
                out[key] = structuredClone(object[key])
            }
        }
    }
    return out
}
