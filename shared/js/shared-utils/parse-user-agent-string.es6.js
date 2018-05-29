module.exports = (uaString) => {
    if (!uaString) uaString = window.navigator.userAgent

    let browser
    let version

    try {
        const rgx = uaString.match(/(Firefox|Chrome|Safari)\/([0-9]+)/)
        browser = rgx[1]
        version = rgx[2]

        if (browser === 'Safari') {
            version = uaString.match(/Version\/(\d+)/)[1]
        }
    } catch (e) {
        // unlikely, prevent extension from exploding if we don't recognize the UA
        browser = version = ''
    }

    return {
        browser: browser,
        version: version
    }
}
