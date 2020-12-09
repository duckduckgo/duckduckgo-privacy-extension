// Access the original setter (needed to bypass React's implementation on mobile)
const originalSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set

// This ensures that the value is set properly and dispatches events to simulate a real user action
const setValue = (el, val) => {
    el.focus()
    originalSet.call(el, val)
    const ev = new Event('input', {bubbles: true})
    el.dispatchEvent(ev)
    el.blur()
}

/**
 * Use IntersectionObserver v2 to make sure the element is visible when clicked
 * https://developers.google.com/web/updates/2019/02/intersectionobserver-v2
 */
const safeExecute = (el, fn) => {
    const intObs = new IntersectionObserver((changes) => {
        for (const change of changes) {
            // Feature detection
            if (typeof change.isVisible === 'undefined') {
                // The browser doesn't support Intersection Observer v2, falling back to v1 behavior.
                change.isVisible = true
            }
            if (change.isIntersecting && change.isVisible) {
                fn()
            }
        }
        intObs.disconnect()
    }, {trackVisibility: true, delay: 100})
    intObs.observe(el)
}

module.exports = { setValue, safeExecute }
