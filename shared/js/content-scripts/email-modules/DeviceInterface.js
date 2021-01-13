const {DDG_DOMAIN_REGEX, sendAndWaitForAnswer} = require('./autofill-utils')
const Form = require('./Form.js')
const scanForInputs = require('./scanForInputs.js')

const DeviceInterface = {
    isDeviceSignedIn: () => new Promise(resolve => chrome.runtime.sendMessage(
        {getSetting: {name: 'userData'}},
        userData => resolve(!!(userData && userData.nextAlias))
    )),
    trySigningIn: () => {
        if (window.origin.match(DDG_DOMAIN_REGEX)) {
            sendAndWaitForAnswer({signMeIn: true}, 'addUserData')
                .then(data => DeviceInterface.storeUserData(data))
        }
    },
    storeUserData: (data) => chrome.runtime.sendMessage(data),
    addDeviceListeners: () => {
        // Add contextual menu listeners
        let activeEl = null
        document.addEventListener('contextmenu', e => {
            activeEl = e.target
        })

        chrome.runtime.onMessage.addListener((message, sender) => {
            if (sender.id !== chrome.runtime.id) return

            switch (message.type) {
                case 'ddgUserReady':
                    scanForInputs(ExtensionInterface)
                    break
                case 'contextualAutofill':
                    Form.autofillInput(activeEl, message.alias)
                    break
                default:
                    break
            }
        })
    },
    addLogoutListener: (handler) => {
        // Cleanup on logout events
        chrome.runtime.onMessage.addListener((message, sender) => {
            if (sender.id === chrome.runtime.id && message.type === 'logout') {
                handler()
            }
        })
    }
}

module.exports = DeviceInterface
