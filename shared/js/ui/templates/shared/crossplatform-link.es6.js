const bel = require('bel')

/* Generates a link that will work on both webextensions and safari
 * url: href url
 * options: any a tag attribute
 */
module.exports = function (url, options) {
        let a = document.createElement('a')
        a.href = url
        for(let key in options) {
            a[key] = options[key]
        }

        if (window.safari) {
            // safari can't use _blank target so we'll add a click handler
            if (a.target === '_blank') {
                a.removeAttribute('target')
                a.href = "javascript:void(0)"
                a.onclick = (() => {
                    safari.application.activeBrowserWindow.openTab().url = url
                    safari.self.hide()
                })
            }
        }

        return a
}
