var mainFrameURL

var onBeforeLoad = (e) => {
    let frame = (window === window.top) ? "main_frame" : "sub_frame"

    if (frame == 'main_frame' && !mainFrameURL) {
        mainFrameURL = getLocation()
    }


    if (e.url) {
        if (!e.url.match(/^https?:\/\/|^\/\//)) return

        console.log(`MAYBE BLOCK ${e.url}`)
        let block = safari.self.tab.canLoad(e, {currentURL: e.target.baseURI, potentialTracker: e.url, frame: frame, mainFrameURL: mainFrameURL})
        if (block.cancel) {
            console.log(`DDG BLOCKING ${e.url}`)
            e.preventDefault()
        }
    }

}

var unload = (e) => {
    if (window === window.top) {
        safari.self.tab.dispatchMessage('unloadTab', {unload: mainFrameURL})
    }
}

// return location without params
function getLocation () {
    return location.protocol + "//" + location.hostname + location.pathname
}

window.onbeforeunload = ((e) => unload(e))
window.onfocus = ((e) => sendLoadEvent(e))

document.addEventListener('beforeload', onBeforeLoad, true);
document.addEventListener("DOMContentLoaded", sendLoadEvent, true)
        
        
function sendLoadEvent (event) {
    if (window === window.top) {
        safari.self.tab.dispatchMessage('tabLoaded', {mainFrameURL: mainFrameURL})
    }
}
