var mainFrameURL
var requestTypes = {
    'iframe': 'sub_frame',
    'frame': 'sub_frame',
    'script': 'script',
    'img': 'image',
    'input': 'image',
    'object': 'object',
    'embed': 'object',
    'link': 'stylesheet'
};

var onBeforeLoad = (e) => {
    let frame = (window === window.top) ? "main_frame" : "sub_frame"

    if (frame == 'main_frame' && !mainFrameURL) {
        mainFrameURL = getLocation()
    }


    if (e.url) {
        if (!e.url.match(/^https?:\/\/|^\/\//)) return

        let requestDetails = {
            currentURL: e.target.baseURI,
            potentialTracker: e.url,
            frame: frame,
            mainFrameURL: mainFrameURL,
            type: requestTypes[e.target.nodeName.toLowerCase()] || 'other'
        }

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

document.addEventListener('beforeload', onBeforeLoad, true);
