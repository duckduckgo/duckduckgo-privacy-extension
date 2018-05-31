module.exports = (uaString) => {
    if (!uaString) uaString = window.navigator.userAgent

    let browser
    let version

    try {
        const parsedUaParts = uaString.match(/(Firefox|Chrome|Safari)\/([0-9]+)/)
        browser = parsedUaParts[1]
        version = parsedUaParts[2]

        // in Safari, the bit immediately after Safari/ is the Webkit version
        // the *actual* version number is elsewhere
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
