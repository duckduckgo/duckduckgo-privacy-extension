var isTop = window === window.top
var contentScript = {}
var frameId
var mainFrameUrl
var possibleTargets = []
var foundScripts = []
var foundFrames = []

window.addEventListener('message', (e) => {
    if (isTop) {
        if (e.data.type === 'frameIdRequest') {
            foundFrames = document.getElementsByTagName('iframe')
            let i = foundFrames.length
            while (i--) {
                let frame = foundFrames[i]
                if (frame.src && frame.id && !e.data.blockedRequests.includes(frame.src) && !frame.className.includes('ddg-hidden')) {
                    frame.contentWindow.postMessage({frameId: frame.id, mainFrameUrl: document.location.href, blockedRequests: e.data.blockedRequests, type: 'setFrameId'}, '*')
                }
            }
        } else if (e.data.type === 'hideFrame') {
            let blockedFrame = document.getElementById(e.data.frameId)
            contentScript.hideFrame(blockedFrame)
        }
    } else {
        if (e.data.type === 'setFrameId') {
            frameId = e.data.frameId
            mainFrameUrl = e.data.mainFrameUrl
            contentScript.locateBlockedFrames(e.data.blockedRequests)
        }
    }
})

chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (req.blockedRequests) {
        if (isTop) {
            contentScript.locateBlockedFrames(req.blockedRequests)
        } else {
            window.top.postMessage({frameUrl: document.location.href, blockedRequests: req.blockedRequests, type: 'frameIdRequest'}, req.mainFrameUrl)
        }
    }
})

contentScript.domIsLoaded = (event) => {
    if (isTop) {
        chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: 'main'})
        foundFrames = document.getElementsByTagName('iframe')
    } else if (window.parent === window.top) {
        chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: 'sub'})
        foundFrames = Array.from(document.getElementsByTagName('iframe'))
        foundScripts = Array.from(document.getElementsByTagName('script'))
        possibleTargets = foundFrames.concat(foundScripts)
    }
}

contentScript.locateBlockedFrames = (requests) => {
    if (isTop) {
        let i = foundFrames.length
        while (i--) {
            let frame = foundFrames[i]
            if (requests.includes(frame.src)) {
                contentScript.hideFrame(frame)
            }
        }
    } else {
        let i = possibleTargets.length
        while (i--) {
            if (possibleTargets[i].src && requests.includes(possibleTargets[i].src)) {
                window.top.postMessage({frameId: frameId, type: 'hideFrame'}, mainFrameUrl)
                break
            }
        }
    }
}

contentScript.hideFrame = (frame) => {
    frame.style.setProperty('display', 'none', 'important')
    frame.hidden = true
    frame.className += ' ' + 'ddg-hidden'
    if (frame.parentNode.children.length === 1) {
        frame.parentNode.style.setProperty('display', 'none', 'important')
    }
}

document.onreadystatechange = () => {
    if (document.readyState === 'interactive') {
        contentScript.domIsLoaded()
    }
}
