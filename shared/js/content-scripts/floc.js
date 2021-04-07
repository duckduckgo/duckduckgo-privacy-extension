(function disableFlocAPI () {
    // don't inject into non-HTML documents (such as XML documents)
    // but do inject into XHTML documents
    if (document instanceof HTMLDocument === false && (
        document instanceof XMLDocument === false ||
        document.createElement('div') instanceof HTMLDivElement === false
    )) {
        return
    }

    if ('interestCohort' in Document.prototype) {
        const scriptElement = document.createElement('script')
        scriptElement.innerHTML = 'delete Document.prototype.interestCohort'
        document.documentElement.prepend(scriptElement)
        // remove element immediately so it is not visible to scripts on the page
        document.documentElement.removeChild(scriptElement)
    }
})()
