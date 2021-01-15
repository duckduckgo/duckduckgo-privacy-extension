/* global globalPrivacyControlValue */
// Set Global Privacy Control property on DOM
(function setDOMSignal () {
    const wrappedNavigator = navigator.wrappedJSObject
    // If GPC on, set DOM property to true if not already true
    if (globalPrivacyControlValue) {
        if (wrappedNavigator.globalPrivacyControl) return
        Object.defineProperty(wrappedNavigator, 'globalPrivacyControl', {
            value: true,
            enumerable: true
        })
    } else {
        // If GPC off, set DOM property prototype to false so it may be overwritten
        // with a true value by user agent or other extensions
        if (typeof wrappedNavigator.globalPrivacyControl !== "undefined") return
        Object.defineProperty(Object.getPrototypeOf(wrappedNavigator), 'globalPrivacyControl', {
            value: false,
            enumerable: true
        })
    }
})()
