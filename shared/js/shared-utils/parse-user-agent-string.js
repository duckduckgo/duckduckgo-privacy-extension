module.exports = (uaString) => {
    if (!globalThis.navigator) return {}

    if (!uaString) uaString = globalThis.navigator.userAgent

    let browser
    let version

    try {
        let parsedUaParts = uaString.match(/(Firefox|Chrome|Edg)\/([0-9]+)/)
        const isEdge = /(Edge?)\/([0-9]+)/
        const isOpera = /(OPR)\/([0-9]+)/
        // Above regex matches on Chrome first, so check if this is really Edge
        if (uaString.match(isEdge)) {
            parsedUaParts = uaString.match(isEdge)
        } else if (uaString.match(isOpera)) {
            parsedUaParts = uaString.match(isOpera)
            parsedUaParts[1] = 'Opera'
        }
        browser = parsedUaParts[1]
        version = parsedUaParts[2]

        // Brave doesn't include any information in the UserAgent
        // @ts-ignore
        if (globalThis.navigator.brave) {
            browser = 'Brave'
        }
    } catch (e) {
        // unlikely, prevent extension from exploding if we don't recognize the UA
        browser = version = ''
    }

    let os = 'o'
    if (globalThis.navigator.userAgent.indexOf('Windows') !== -1) os = 'w'
    if (globalThis.navigator.userAgent.indexOf('Mac') !== -1) os = 'm'
    if (globalThis.navigator.userAgent.indexOf('Linux') !== -1) os = 'l'

    return {
        os,
        browser,
        version
    }
}
