const isDDGApp = () =>
    /(iPhone|iPad|Android).*DuckDuckGo\/[0-9]/i.test(window.navigator.userAgent)

const DDG_DOMAIN_REGEX = new RegExp(/^https:\/\/(([a-z0-9-_]+?)\.)?duckduckgo\.com/)

const isDDGDomain = () => window.origin.match(DDG_DOMAIN_REGEX)

// Send a message to the web app (only on DDG domains)
const notifyWebApp = (message) => {
    if (isDDGDomain()) {
        window.postMessage(message, window.origin)
    }
}
/**
 * Sends a message and returns a Promise that resolves with the response
 * @param {{} | Function} msgOrFn - a fn to call or an object to send via postMessage
 * @param {String} expectedResponse - the name of the response
 * @returns {Promise<unknown>}
 */
const sendAndWaitForAnswer = (msgOrFn, expectedResponse) => {
    if (typeof msgOrFn === 'function') {
        msgOrFn()
    } else {
        window.postMessage(msgOrFn, window.origin)
    }

    return new Promise((resolve) => {
        const handler = e => {
            if (e.origin !== window.origin) return
            if (!e.data || (e.data && !(e.data[expectedResponse] || e.data.type === expectedResponse))) return

            resolve(e.data)
            window.removeEventListener('message', handler)
        }
        window.addEventListener('message', handler)
    })
}

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

const getDaxBoundingBox = (input) => {
    const {right: inputRight, top: inputTop, height: inputHeight} = input.getBoundingClientRect()
    const inputRightPadding = parseInt(getComputedStyle(input).paddingRight)
    const width = 30
    const height = 30
    const top = inputTop + (inputHeight - height) / 2
    const right = inputRight - inputRightPadding
    const left = right - width
    const bottom = top + height

    return {bottom, height, left, right, top, width, x: left, y: top}
}

const isEventWithinDax = (e, input) => {
    const {left, right, top, bottom} = getDaxBoundingBox(input)
    const withinX = e.clientX >= left && e.clientX <= right
    const withinY = e.clientY >= top && e.clientY <= bottom

    return withinX && withinY
}

const addInlineStyles = (el, styles) => Object.values(styles)
    .forEach(({jsName, val}) => (el.style[jsName] = val))

const removeInlineStyles = (el, styles) => Object.keys(styles)
    .forEach(prop => el.style.removeProperty(prop))

module.exports = {
    isDDGApp,
    DDG_DOMAIN_REGEX,
    isDDGDomain,
    notifyWebApp,
    sendAndWaitForAnswer,
    setValue,
    safeExecute,
    getDaxBoundingBox,
    isEventWithinDax,
    addInlineStyles,
    removeInlineStyles
}
