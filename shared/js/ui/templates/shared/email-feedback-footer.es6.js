module.exports = function (browserInfo, url) {
    let footer = '---\n'

    // append URL if the user is sending feedback to do with a specific tab
    if (url) {
        footer += `URL is ${url}\n`
    }

    footer += `Browser is ${browserInfo.browser} ${browserInfo.version}
Extension version is ${browserInfo.extension}`

    return footer
}
