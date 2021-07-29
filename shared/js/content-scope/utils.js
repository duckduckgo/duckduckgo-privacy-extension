/* global exportFunction */
import sjcl from './sjcl'

export function getDataKeySync (sessionKey, domainKey, inputData) {
    // eslint-disable-next-line new-cap
    const hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(sessionKey + domainKey), sjcl.hash.sha256)
    return sjcl.codec.hex.fromBits(hmac.encrypt(inputData))
}

// linear feedback shift register to find a random approximation
export function nextRandom (v) {
    return Math.abs((v >> 1) | (((v << 62) ^ (v << 61)) & (~(~0 << 63) << 62)))
}

const exemptionLists = {}
export function shouldExemptUrl (type, url) {
    for (const regex of exemptionLists[type]) {
        if (regex.test(url)) {
            return true
        }
    }
    return false
}

let debug = false

export function initStringExemptionLists (args) {
    const { stringExemptionLists } = args
    debug = args.debug
    for (const type in stringExemptionLists) {
        exemptionLists[type] = []
        for (const stringExemption of stringExemptionLists[type]) {
            exemptionLists[type].push(new RegExp(stringExemption))
        }
    }
}

// Checks the stack trace if there are known libraries that are broken.
export function shouldExemptMethod (type) {
    try {
        const errorLines = new Error().stack.split('\n')
        const errorFiles = new Set()
        // Should cater for Chrome and Firefox stacks, we only care about https? resources.
        const lineTest = /(\()?(http[^)]+):[0-9]+:[0-9]+(\))?/
        for (const line of errorLines) {
            const res = line.match(lineTest)
            if (res) {
                const path = res[2]
                // checked already
                if (errorFiles.has(path)) {
                    continue
                }
                if (shouldExemptUrl(type, path)) {
                    return true
                }
                errorFiles.add(res[2])
            }
        }
    } catch (e) {
        // Fall through
    }
    return false
}

// Iterate through the key, passing an item index and a byte to be modified
export function iterateDataKey (key, callback) {
    let item = key.charCodeAt(0)
    for (const i in key) {
        let byte = key.charCodeAt(i)
        for (let j = 8; j >= 0; j--) {
            callback(item, byte)

            // find next item to perturb
            item = nextRandom(item)

            // Right shift as we use the least significant bit of it
            byte = byte >> 1
        }
    }
}

export function isFeatureBroken (args, feature) {
    return args.site.brokenFeatures.includes(feature)
}

/**
 * For each property defined on the object, update it with the target value.
 */
export function overrideProperty (name, prop) {
    // Don't update if existing value is undefined or null
    if (!(prop.origValue === undefined)) {
        /**
         * When re-defining properties, we bind the overwritten functions to null. This prevents
         * sites from using toString to see if the function has been overwritten
         * without this bind call, a site could run something like
         * `Object.getOwnPropertyDescriptor(Screen.prototype, "availTop").get.toString()` and see
         * the contents of the function. Appending .bind(null) to the function definition will
         * have the same toString call return the default [native code]
         */
        try {
            defineProperty(prop.object, name, {
                // eslint-disable-next-line no-extra-bind
                get: (() => prop.targetValue).bind(null)
            })
        } catch (e) {
        }
    }
    return prop.origValue
}

// TODO make rollup aware of this so it can tree shake
const mozProxies = 'wrappedJSObject' in window

export function defineProperty (object, propertyName, descriptor) {
    if (mozProxies) {
        const usedObj = object.wrappedJSObject
        const UsedObjectInterface = window.wrappedJSObject.Object
        const definedDescriptor = new UsedObjectInterface();
        ['configurable', 'enumerable', 'value', 'writable'].forEach((propertyName) => {
            // TODO check if value is complex and export it if so.
            if (propertyName in descriptor) {
                definedDescriptor[propertyName] = descriptor[propertyName]
            }
        });
        ['get', 'set'].forEach((methodName) => {
            if (methodName in descriptor) {
                exportFunction(descriptor[methodName], definedDescriptor, { defineAs: methodName })
            }
        })
        UsedObjectInterface.defineProperty(usedObj, propertyName, definedDescriptor)
    } else {
        Object.defineProperty(object, propertyName, descriptor)
    }
}

function camelcase (dashCaseText) {
    return dashCaseText.replace(/-(.)/g, (match, letter) => {
        return letter.toUpperCase()
    })
}

export class DDGProxy {
    constructor (featureName, objectScope, property, proxyObject) {
        this.objectScope = objectScope
        this.property = property
        this.featureName = featureName
        const outputHandler = (...args) => {
            const isExempt = shouldExemptMethod(this.featureName)
            if (debug) {
                postDebugMessage(camelcase(this.featureName), {
                    action: isExempt ? 'ignore' : 'restrict',
                    kind: this.property,
                    documentUrl: document.location.href,
                    stack: new Error().stack,
                    args: JSON.stringify(args[2])
                })
            }
            // The normal return value
            if (isExempt) {
                return DDGReflect.apply(...args)
            }
            return proxyObject.apply(...args)
        }
        if (mozProxies) {
            this._native = objectScope[property]
            const handler = new window.wrappedJSObject.Object()
            handler.apply = exportFunction(outputHandler, window)
            this.internal = new window.wrappedJSObject.Proxy(objectScope.wrappedJSObject[property], handler)
        } else {
            this._native = objectScope[property]
            const handler = {}
            handler.apply = outputHandler
            this.internal = new window.Proxy(objectScope[property], handler)
        }
    }

    // Actually apply the proxy to the native property
    overload () {
        if (mozProxies) {
            exportFunction(this.internal, this.objectScope, { defineAs: this.property })
        } else {
            this.objectScope[this.property] = this.internal
        }
    }
}

export function postDebugMessage (feature, message) {
    window.postMessage({
        action: feature,
        message
    })
}

export let DDGReflect

if (mozProxies) {
    DDGReflect = window.wrappedJSObject.Reflect
} else {
    DDGReflect = window.Reflect
}
