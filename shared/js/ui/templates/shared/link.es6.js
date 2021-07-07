/* Generates a link tag
 * url: href url
 * options: any a tag attribute
 */
module.exports = function (url, options) {
    const a = document.createElement('a')
    a.href = url

    // attributes for the <a> tag, e.g. "aria-label"
    if (options.attributes) {
        for (const attr in options.attributes) {
            a.setAttribute(attr, options.attributes[attr])
        }

        delete options.attributes
    }

    for (const key in options) {
        a[key] = options[key]
    }

    return a
}
