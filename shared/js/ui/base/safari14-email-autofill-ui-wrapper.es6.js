let fetch = (message) => {
    return new Promise((resolve, reject) => {
        window.chrome.runtime.sendMessage(message, (result) => resolve(result))
    })
}

let backgroundMessage = () => {
    // listen for messages from background and notify subscribers
    window.chrome.runtime.onMessage.addListener((req, sender) => {
        if (sender.id !== chrome.runtime.id) return
        if (req.closePopup) window.close()
    })
}

module.exports = {
    fetch: fetch,
    backgroundMessage: backgroundMessage
}
