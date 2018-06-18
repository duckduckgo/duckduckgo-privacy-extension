var isTop = window === window.top;
var contentScript = {};
var frameId;
var mainFrameUrl;
var possibleTargets = [];
var foundScripts = [];
var foundFrames = [];


window.addEventListener("message", (e) => {
    if (isTop) {
        if (e.data.frameUrl) {
            foundFrames = document.getElementsByTagName('iframe');
            let i = foundFrames.length;
            while (i--) {
                let frame = foundFrames[i];
                if (frame.src && !e.data.blockedRequests.includes(frame.src)) {
                    frame.contentWindow.postMessage({frameId: frame.id, mainFrameUrl: document.location.href, blockedRequests: e.data.blockedRequests}, frame.src);
                }
            }
        } else if (e.data.frameId) {
            console.log("hiding top level iframe with id", e.data.frameId);
            let blockedFrame = document.getElementById(e.data.frameId);
            blockedFrame.hidden = true;
            blockedFrame.style.setProperty('display', 'none', 'important');
            if (blockedFrame.parentNode.children.length === 1) {
                blockedFrame.parentNode.style.setProperty('display', 'none', 'important');
            }
        }
    } else {
        if (e.data.frameId) {
            frameId = e.data.frameId;
            mainFrameUrl = e.data.mainFrameUrl
            contentScript.locateBlockedFrames(e.data.blockedRequests);
        }
    }
});

chrome.runtime.onMessage.addListener((req, sender, res) => {
    if (req.blockedRequests) {
        if (isTop) {
            contentScript.locateBlockedFrames(req.blockedRequests);
        } else {
            window.top.postMessage({frameUrl: document.location.href, blockedRequests: req.blockedRequests}, '*');
        }
    }
});

contentScript.domIsLoaded = (event) => {
    if (isTop) {
        chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: 'main'});
        foundFrames = document.getElementsByTagName('iframe');
    } else {
        chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: 'sub'});
        foundFrames = Array.from(document.getElementsByTagName('iframe'))
        foundScripts = Array.from(document.getElementsByTagName('script'));
        possibleTargets = foundFrames.concat(foundScripts);
    }

}

contentScript.locateBlockedFrames = (requests) => {
    if (isTop) {
        let i = foundFrames.length;
        while (i--) {
//          console.log("found frame src", foundFrames[i].src);
            if (requests.includes(foundFrames[i].src)) {
                foundFrames[i].style.setProperty('display', 'none', 'important');
                foundFrames[i].hidden = true;
            }
        }
    } else {
        let i = possibleTargets.length;
        while (i--) {
            if (possibleTargets[i].src && requests.includes(possibleTargets[i].src)) {
//                console.log("passing top level iframe back to main frame", frameId);
                window.top.postMessage({frameId: frameId}, mainFrameUrl);
            }
        }
    }
}

document.onreadystatechange = function() {
    if (document.readyState === "interactive") {
        contentScript.domIsLoaded();
    }
}
