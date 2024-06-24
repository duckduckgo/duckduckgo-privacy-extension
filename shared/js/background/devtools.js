/**
 * This module serves as a limited interface through to the most recently
 * registered Devtools component instance (if any). That way code outside of
 * components/ can still send messages through to a Devtools instance. In the
 * future, once Devtools is only accessed from other components this should be
 * removed.
 *
 * See shared/js/background/components/
 */

let devtools = null

export function registerDevtools (newDevtools) {
    devtools = newDevtools
}

export function isActive (tabId) {
    if (devtools) {
        return devtools.isActive(tabId)
    }
    return false
}

export function postMessage (tabId, action, message) {
    if (devtools) {
        devtools.postMessage(tabId, action, message)
    }
}
