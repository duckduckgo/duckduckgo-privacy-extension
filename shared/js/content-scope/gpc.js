// Set Global Privacy Control property on DOM
export function initGpc(args) {
    // If GPC on, set DOM property to true if not already true
    if (args.globalPrivacyControlValue) {
        if (navigator.globalPrivacyControl) return
        Object.defineProperty(navigator, 'globalPrivacyControl', {
            value: true,
            enumerable: true
        })
    } else {
        // If GPC off, set DOM property prototype to false so it may be overwritten
        // with a true value by user agent or other extensions
        if (typeof navigator.globalPrivacyControl !== "undefined") return
        Object.defineProperty(Object.getPrototypeOf(navigator), 'globalPrivacyControl', {
            value: false,
            enumerable: true
        })
    }
}
