/**
* This is injected programatically on the DuckDuckGo SERP (mostly during the first search
* post extension install) to assist with user onboarding
* We handle 2 cases:
* - Firefox: we simply call a method on window so that the SERP can display a welcome
* message to users
* - Chrome: we do the same thing (but provide more data) and set-up listeners so that
* the SERP can:
*    - Assess if the extension has been deactivated by Chrome
*    - Reschedule the onboarding for the next restart
*/
function onDocumentEnd ({
    isAddressBarQuery,
    showWelcomeBanner,
    showCounterMessaging,
    extensionId,
    duckDuckGoSerpHostname,
    browserName,
    manifestVersion
}) {
    const origin = `https://${duckDuckGoSerpHostname}`

    /**
     * Helper function that grabs value of the content-script created by
     * `createOnboardingCodeInjectedAtDocumentStart` that was injected earlier to capture
     * variables at an earlier stage of the page lifecycle
     */
    function getDocumentStartData (cb) {
        if (browserName !== 'chrome') {
            return cb()
        }

        window.postMessage({ type: 'documentStartDataRequest' }, origin)
        window.addEventListener('message', function handleMessage (e) {
            if (e.origin === origin && e.data.type === 'documentStartDataResponse') {
                window.removeEventListener('message', handleMessage)
                cb(e.data.payload)
            }
        })
    }

    function start () {
        getDocumentStartData((documentStartData) => {
            // DDG privacy policy prevents us to use `chrome.runtime` on the SERP so we
            // setup a relay here so that the SERP can communicate with the background process
            if (browserName === 'chrome') {
                window.addEventListener('message', (e) => {
                    if (e.origin === origin) {
                        switch (e.data.type) {
                        case 'healthCheckRequest': {
                            try {
                                chrome.runtime.sendMessage(extensionId, e.data.type, (response) => {
                                    e.source.postMessage(
                                        { type: 'healthCheckResponse', isAlive: !chrome.runtime.lastError },
                                        e.origin
                                    )
                                })
                            } catch (err) {
                                e.source.postMessage(
                                    { type: 'healthCheckResponse', isAlive: false },
                                    e.origin
                                )
                            }
                            break
                        }

                        case 'rescheduleCounterMessagingRequest': {
                            chrome.runtime.sendMessage(extensionId, e.data.type, (response) => {
                                if (chrome.runtime.lastError) {
                                    console.error(chrome.runtime.lastError)
                                }
                            })
                            break
                        }
                        }
                    }
                })
            }

            // This content script in the "isolated world" does not share the
            // same `window` Object as the website itself (in the "main world").
            // Call onFirstSearchPostExtensionInstall in the "main world"
            // instead.
            //
            // Note that this is not done through messaging in order to prevent
            // setting up an event listner on the SERP (this would be wasteful)
            // as this is only needed on the _first_ search post extension install

            // For MV3 builds, send a message to the "main world" content script.
            if (manifestVersion === 3) {
                window.postMessage({ type: 'onFirstSearch', documentStartData })
                return
            }

            // For MV2 builds, inject a `<script>` element.
            const script = document.createElement('script')
            script.textContent = `
                    if (window.onFirstSearchPostExtensionInstall) {
                        window.onFirstSearchPostExtensionInstall(${JSON.stringify(Object.assign({ isAddressBarQuery, showWelcomeBanner, showCounterMessaging }, documentStartData))})
                    }
                `
            document.head.appendChild(script)
        })
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }
}

function onDocumentEndMainWorld ({
    isAddressBarQuery,
    showWelcomeBanner,
    showCounterMessaging
}) {
    window.addEventListener('message', function handleFirstSearchMessage (e) {
        if (e.origin === origin && e.data.type === 'onFirstSearch') {
            window.removeEventListener('message', handleFirstSearchMessage)

            if (window.onFirstSearchPostExtensionInstall) {
                const { documentStartData } = e.data
                window.onFirstSearchPostExtensionInstall({
                    isAddressBarQuery,
                    showWelcomeBanner,
                    showCounterMessaging,
                    ...documentStartData
                })
            }
        }
    })
}

function onDocumentStart ({ duckDuckGoSerpHostname }) {
    const hadFocusOnStart = document.hasFocus()

    window.addEventListener('message', function handleMessage (e) {
        if (e.origin === `https://${duckDuckGoSerpHostname}` && e.data.type === 'documentStartDataRequest') {
            window.removeEventListener('message', handleMessage)
            e.source.postMessage({ type: 'documentStartDataResponse', payload: { hadFocusOnStart } }, e.origin)
        }
    })
}

module.exports = {
    onDocumentEnd,
    onDocumentEndMainWorld,
    onDocumentStart
}
