/**
* This is only injected on duckduckgo.com to assist with user onboarding
*/

function createOnboardingCode ({
    isAddressBarQuery,
    showWelcomeBanner,
    showCounterMessaging,
    extensionId,
    browser
} = {}) {
    const params = JSON.stringify({
        isAddressBarQuery,
        showWelcomeBanner,
        showCounterMessaging,
        extensionId,
        browser
    })

    // TODO: upgrade to `chrome.scripting.executeScript` when we upgrade to manifest v3
    // as it allows to inject a function with _arguments_. Here we simulate that in a hacky way
    return `(${onboarding.toString().replace('__injectedJSON__', `'${params}'`)})()`
}

function onboarding () {
    const {
        isAddressBarQuery,
        showWelcomeBanner,
        showCounterMessaging,
        browser,
        extensionId
    } = JSON.parse(__injectedJSON__) // eslint-disable-line

    function getDocumentStartData (cb) {
        if (browser !== 'chrome') {
            return cb(null)
        }

        window.postMessage({ type: 'documentStartDataRequest' }, window.location.origin)
        window.addEventListener('message', function handleMessage (e) {
            if (e.origin === window.location.origin && e.data.type === 'documentStartDataResponse') {
                window.removeEventListener('message', handleMessage)
                cb(null, e.data.payload)
            }
        })
    }

    function start () {
        // Consolidate data: grab value of the Chrome Dialogue content-script
        // this script was injected earlier to capture value as early as possible
        getDocumentStartData((err, documentStartData) => {
            if (err) {
                console.error(err)
            }

            const args = Object.assign({
                isAddressBarQuery,
                showWelcomeBanner,
                showCounterMessaging
            }, documentStartData)

            // the content script do not share the same `window` as the page
            // so we inject a `<script>` to be able to access the page `window`
            const script = document.createElement('script')
            script.textContent = `
                    if (window.onFirstSearchPostExtensionInstall) {
                        window.onFirstSearchPostExtensionInstall(${JSON.stringify(args)})
                    }
                `
            document.head.appendChild(script)

            // DDG privacy policy prevents us to use `chrome.runtime` on the SERP so we
            // setup a relay here so that the SERP can assess the background process
            if (browser === 'chrome') {
                window.addEventListener('message', (e) => {
                    if (e.origin === window.location.origin) {
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
        })
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        start()
    } else {
        document.addEventListener('DOMContentLoaded', start)
    }
}

module.exports = createOnboardingCode
