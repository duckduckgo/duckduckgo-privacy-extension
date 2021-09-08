import { defineProperty } from './utils'

// Set Global Privacy Control property on DOM
export function init (args) {
    try {
        // If GPC on, set DOM property to true if not already true
        if (args.globalPrivacyControlValue) {
            if (navigator.globalPrivacyControl) return
            defineProperty(navigator, 'globalPrivacyControl', {
                value: true,
                enumerable: true
            })
        } else {
            // If GPC off, set DOM property prototype to false so it may be overwritten
            // with a true value by user agent or other extensions
            if (typeof navigator.globalPrivacyControl !== 'undefined') return
            defineProperty(Object.getPrototypeOf(navigator), 'globalPrivacyControl', {
                value: false,
                enumerable: true
            })
        }
    } catch {
        // Ignore exceptions that could be caused by conflicting with other extensions
    }
}
