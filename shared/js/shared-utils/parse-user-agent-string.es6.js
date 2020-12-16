module.exports = (uaString) => {
    if (!uaString) uaString = window.navigator.userAgent

    let browser
    let version

    try {
        let parsedUaParts = uaString.match(/(Firefox|Chrome|Safari|Edg)\/([0-9]+)/)
        if (uaString.match(/(Edge?)\/([0-9]+)/)) {
            // Above regex matches on Chrome first, so check if this is really Edge
            parsedUaParts = uaString.match(/(Edge?)\/([0-9]+)/)
        }
        browser = parsedUaParts[1]
        version = parsedUaParts[2]

        // in Safari, the bit immediately after Safari/ is the Webkit version
        // the *actual* version number is elsewhere
        if (browser === 'Safari') {
            version = uaString.match(/Version\/(\d+)/)[1]
        }
        // Brave doesn't include any information in the UserAgent
        if (window.navigator.brave) {
            browser = 'Brave'
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
