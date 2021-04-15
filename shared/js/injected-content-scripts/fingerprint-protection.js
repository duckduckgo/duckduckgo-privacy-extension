/**
 * Manages fingerprint protection of JavaScript browser API's. Overwrites
 * object properties and methods to reduce entropy or modify fingerprint
 * data through obsufcation / randomness.
 */
/* globals ddg_args */

// Function called from chrome-events.es6.js and injected as a variable
(function protect (args) {
    // Exclude some content types from injection
    const elem = document.head || document.documentElement
    try {
        const contentType = elem.ownerDocument.contentType
        if (contentType === 'application/xml' ||
            contentType === 'application/json' ||
            contentType === 'text/xml' ||
            contentType === 'text/json' ||
            contentType === 'text/rss+xml' ||
            contentType === 'application/rss+xml'
        ) {
            return
        }
    } catch (e) {
        // if we can't find content type, go ahead with injection.
    }

    // Property values to be set and their original values.
    const fingerprintPropertyValues = {
        hardware: {
            keyboard: {
                object: 'Navigator.prototype',
                origValue: navigator.keyboard,
                targetValue: undefined
            },
            hardwareConcurrency: {
                object: 'Navigator.prototype',
                origValue: navigator.hardwareConcurrency,
                targetValue: 8
            },
            deviceMemory: {
                object: 'Navigator.prototype',
                origValue: navigator.deviceMemory,
                targetValue: 8
            }
        },
        options: {
            doNotTrack: {
                object: 'Navigator.prototype',
                origValue: navigator.doNotTrack,
                targetValue: /Firefox/i.test(navigator.userAgent) ? 'unspecified' : null
            }
        }
    }


    /**
     * For each property defined on the object, update it with the target value.
     */
    function buildScriptProperties () {
        let script = ''
        for (const category in fingerprintPropertyValues) {
            for (const [name, prop] of Object.entries(fingerprintPropertyValues[category])) {
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
                    script += `try {
                        Object.defineProperty(${prop.object}, "${name}", {get: (() => ${JSON.stringify(prop.targetValue)}).bind(null)});
                    } catch (e) {}
                    `
                }
            }
        }
        return script
    }

    /**
     * All the steps for building the injection script. Should only be done at initial page load.
     */
    function buildInjectionScript () {
        let script = buildScriptProperties()
        return script
    }
    /**
     * Inject all the overwrites into the page.
     */
    function inject (scriptToInject, removeAfterExec, elemToInject) {
        // Inject into main page
        try {
            const e = document.createElement('script')
            e.textContent = `(() => {
                ${scriptToInject}
            })();`
            elemToInject.appendChild(e)

            if (removeAfterExec) {
                e.remove()
            }
        } catch (e) {
        }
    }

    const injectionScript = buildInjectionScript()
    inject(injectionScript, true, elem)
})(ddg_args)
