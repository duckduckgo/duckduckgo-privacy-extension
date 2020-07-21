/**
 * Manages fingerprint protection of JavaScript browser API's. Overwrites
 * object properties and methods to reduce entropy or modify fingerprint
 * data through obsufcation / randomness.
 */

(function protect () {
    // Property values to be set and their original values.
    const fingerprintPropertyValues = {
        'screen': {
            'availTop': {
                'object': 'screen',
                'origValue': screen.availTop,
                'targetValue': 0
            },
            'availLeft': {
                'object': 'screen',
                'origValue': screen.availLeft,
                'targetValue': 0
            },
            'availWidth': {
                'object': 'screen',
                'origValue': screen.availWidth,
                'targetValue': screen.width
            },
            'availHeight': {
                'object': 'screen',
                'origValue': screen.availHeight,
                'targetValue': screen.height
            },
            'colorDepth': {
                'object': 'screen',
                'origValue': screen.colorDepth,
                'targetValue': 24
            },
            'pixelDepth': {
                'object': 'screen',
                'origValue': screen.pixelDepth,
                'targetValue': 24
            }
        },
        'hardware': {
            'keyboard': {
                'object': 'navigator',
                'origValue': navigator.keyboard,
                'targetValue': undefined
            },
            'hardwareConcurrency': {
                'object': 'navigator',
                'origValue': navigator.hardwareConcurrency,
                'targetValue': 8
            },
            'deviceMemory': {
                'object': 'navigator',
                'origValue': navigator.deviceMemory,
                'targetValue': 8
            }
        },
        'storage': {
            'webkitTemporaryStorage': {
                'object': 'navigator',
                'origValue': navigator.webkitTemporaryStorage,
                'targetValue': undefined
            },
            'webkitPersistentStorage': {
                'object': 'navigator',
                'origValue': navigator.webkitPersistentStorage,
                'targetValue': undefined
            }
        },
        'options': {
            'doNotTrack': {
                'object': 'navigator',
                'origValue': navigator.doNotTrack,
                'targetValue': /Firefox/i.test(navigator.userAgent) ? '"unspecified"' : null
            }
        }
    }

    /*
     * Return device specific battery value that prevents fingerprinting.
     * On Desktop/Laptop - fully charged and plugged in.
     * On Mobile, should not plugged in with random battery values every load.
     * Property event functions are also defined, for setting later.
     */
    function getBattery () {
        let battery = {}
        battery.value = {
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
        }
        battery.properties = ['onchargingchange', 'onchargingtimechange', 'ondischargingtimechange', 'onlevelchange']
        return battery
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
                    script += `Object.defineProperty(${prop.object}, "${name}", { value: ${prop.targetValue} });\n`
                }
            }
        }
        return script
    }

    /**
     *  Build a script that overwrites the Battery API if present in the browser.
     *  It will return the values defined in the getBattery function to the client,
     *  as well as prevent any script from listening to events.
     */
    function buildBatteryScript () {
        if (navigator.getBattery) {
            const battery = getBattery()
            let batteryScript = `
                navigator.getBattery = function getBattery () {
                let battery = ${JSON.stringify(battery.value)}
            `
            for (const prop of battery.properties) {
                // Prevent setting events via event handlers
                batteryScript += `
                    Object.defineProperty(battery, '${prop}', {
                        enumerable: true,
                        configurable: false,
                        writable: false,
                        value: undefined
                    })
                `
            }

            // Wrap event listener functions so handlers aren't added
            for (const handler of ['addEventListener']) {
                batteryScript += `
                    battery.${handler} = function ${handler} () {
                        return
                    }
                `
            }
            batteryScript += `
                return Promise.resolve(battery)
                }
            `
            return batteryScript
        } else {
            return ''
        }
    }

    /**
     * All the steps for building the injection script. Should only be done at initial page load.
     */
    function buildInjectionScript () {
        let script = buildScriptProperties()
        script += buildBatteryScript()
        script += setWindowDimensions()
        return script
    }

    /**
     * normalize window dimensions, if more than one monitor is in play.
     *  X/Y values are set in the browser based on distance to the main monitor top or left, which
     * can mean second or more monitors have very large or negative values. This function maps a given
     * given coordinate value to the proper place on the main screen.
     */
    function normalizeWindowDimension (value, targetDimension) {
        if (value > targetDimension) {
            return value % targetDimension
        }
        if (value < 0) {
            return targetDimension + value
        }
        return value
    }

    function setWindowPropertyValue (property, value, catchErrors=false) {
        let script = `window.${property} = ${value}\n`
        if (catchErrors) {
            script = `
                try {
                    ${script}
                } catch (e) {}
            `
        }
        return script
    }

    /**
     * Fix window dimensions. The extension runs in a different JS context than the
     * page, so we can inject the correct screen values as the window is resized,
     * ensuring that no information is leaked as the dimensions change, but also that the
     * values change correctly for valid use cases.
     */
    function setWindowDimensions () {
        let windowScript = ''
        const normalizedY = normalizeWindowDimension(window.screenY, window.screen.height)
        const normalizedX = normalizeWindowDimension(window.screenX, window.screen.width)

        if (normalizedY <= fingerprintPropertyValues.screen.availTop.origValue) {
            windowScript += setWindowPropertyValue('screenY', 0)
            windowScript += setWindowPropertyValue('screenTop', 0)
            windowScript += setWindowPropertyValue('top.window.outerHeight', 'window.screen.height', true)
        } else {
            windowScript += setWindowPropertyValue('screenY', normalizedY)
            windowScript += setWindowPropertyValue('screenTop', normalizedY)
            try {
                windowScript += setWindowPropertyValue('top.window.outerHeight', top.window.outerHeight, true)
            } catch (e) {
                // top not accessible to certain iFrames, so ignore.
            }
        }
        if (normalizedX <= fingerprintPropertyValues.screen.availLeft.origValue) {
            windowScript += setWindowPropertyValue('screenX', 0)
            windowScript += setWindowPropertyValue('screenLeft', 0)
            windowScript += setWindowPropertyValue('top.window.outerWidth', 'window.screen.width', true)
        } else {
            windowScript += setWindowPropertyValue('screenX', normalizedX)
            windowScript += setWindowPropertyValue('screenLeft', normalizedX)
            try {
                windowScript += setWindowPropertyValue('top.window.outerWidth', top.window.outerWidth, true)
            } catch (e) {
                // top not accessible to certain iFrames, so ignore.
            }
        }

        return windowScript
    }

    /**
     * Inject all the overwrites into the page.
     */
    function inject (scriptToInject, removeAfterExec) {
        // Inject into main page
        let e = document.createElement('script')
        e.textContent = scriptToInject;
        (document.head || document.documentElement).appendChild(e)

        if (removeAfterExec) {
            e.remove()
        }
    }

    window.addEventListener('resize', function () {
        const windowScript = setWindowDimensions()
        inject(windowScript, true)
    })

    const injectionScript = buildInjectionScript()
    inject(injectionScript)
})()
