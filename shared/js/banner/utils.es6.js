'use strict'

function isGoogleSerp () {
    return document.URL.indexOf('/search') !== -1
}

// Create HTML element from string
function htmlToElement (htmlString) {
    var template = document.createElement('template')
    // Never return a text node of whitespace as the result
    const html = htmlString.trim()
    template.innerHTML = html
    return template.content.firstChild
}

module.exports = {
    htmlToElement,
    isGoogleSerp
}
