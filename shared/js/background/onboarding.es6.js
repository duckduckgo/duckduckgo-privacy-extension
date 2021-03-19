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
function createOnboardingCode (params) {
    // TODO: upgrade to `chrome.scripting.executeScript` when we upgrade to manifest v3
    // as it allows to inject a function with _arguments_. Here we simulate that in a hacky way
    return `(${onboarding.toString()})(${JSON.stringify(params)})`
}

function onboarding ({
    isAddressBarQuery,
    showWelcomeBanner,
    showCounterMessaging,
    extensionId,
    duckDuckGoSerpHostname,
    browser
}) {
    const origin = `https://${duckDuckGoSerpHostname}`

    /**
     * Helper function that grabs value of the `serp-document-start-handler` content-script
     * Note that the `serp-document-start-handler`script was injected earlier to capture
     * variables at an earlier stage of the page lifecycle
     */
    function getDocumentStartData (cb) {
        if (browser !== 'chrome') {
            return cb(null)
        }

        window.postMessage({ type: 'documentStartDataRequest' }, origin)
        window.addEventListener('message', function handleMessage (e) {
            if (e.origin === origin && e.data.type === 'documentStartDataResponse') {
                window.removeEventListener('message', handleMessage)
                cb(null, e.data.payload)
            }
        })
    }

    function start () {
        getDocumentStartData((err, documentStartData) => {
            if (err) {
                console.error(err)
            }

            // DDG privacy policy prevents us to use `chrome.runtime` on the SERP so we
            // setup a relay here so that the SERP can communicate with the background process
            if (browser === 'chrome') {
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

            // The content script do not share the same `window` as the page
            // so we inject a `<script>` to be able to access the page `window`
            //
            // Note that this is not done through messaging in order to prevent
            // setting up an event listner on the SERP (this would be wasteful)
            // as this is only needed on the _first_ search post extension install
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

module.exports = createOnboardingCode
