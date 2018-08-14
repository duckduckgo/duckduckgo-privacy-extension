/* Generates a link that will work on both webextensions and safari
 * url: href url
 * options: any a tag attribute
 */
module.exports = function (url, options) {
    let a = document.createElement('a')
    a.href = url

    // attributes for the <a> tag, e.g. "aria-label"
    if (options.attributes) {
        for (let attr in options.attributes) {
            a.setAttribute(attr, options.attributes[attr])
        }

        delete options.attributes
    }

    for (let key in options) {
        a[key] = options[key]
    }

    if (window.safari) {
        // safari can't use _blank target so we'll add a click handler
        if (a.target === '_blank') {
            a.removeAttribute('target')
            a.href = 'javascript:void(0)'
            a.onclick = () => {
                window.safari.application.activeBrowserWindow.openTab().url = url
                window.safari.self.hide()
            }
        }
    }

    return a
}
