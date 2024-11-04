/**
 * This is used by the dashboard to get the tab data.
 */
export class LegacyTabTransfer {
    /**
     * @param {import('./tab')} tab
     */
    constructor(tab) {
        const clonedTab = cloneClassObject(tab)
        const entries = Object.entries(clonedTab)
        for (const [key] of entries) {
            this[key] = clonedTab[key]
        }
    }
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isPrimitive(value) {
    return Object(value) !== value
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function isStructuredCloneable(value) {
    return isPrimitive(value) || Array.isArray(value)
}

function cloneClassObject(object) {
    if (isStructuredCloneable(object)) {
        return structuredClone(object)
    }
    const out = {}
    for (const key of Object.keys(object)) {
        const value = object[key]
        // Ignore 'private' keys
        if (key.startsWith('_')) {
            continue
        }
        if (isStructuredCloneable(value)) {
            out[key] = structuredClone(value)
        } else {
            out[key] = cloneClassObject(value)
        }
    }
    if (hasModifiedPrototype(object)) {
        const objectDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(object))
        // Clone getter values
        for (const [key, value] of Object.entries(objectDescriptors)) {
            if (typeof value.get === 'function') {
                out[key] = cloneClassObject(object[key])
            }
        }
    }
    return out
}

function hasModifiedPrototype(object) {
    return Object.getPrototypeOf(object) !== Object.getPrototypeOf({})
}
