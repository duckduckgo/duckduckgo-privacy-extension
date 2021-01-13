const {DDG_DOMAIN_REGEX, sendAndWaitForAnswer} = require('./autofill-utils')
const scanForInputs = require('./scanForInputs.js')
const {setValue} = require('./autofill-utils')
const {isDDGApp} = require('./autofill-utils')

const ExtensionInterface = {
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
                    setValue(activeEl, message.alias)
                    activeEl.classList.add('ddg-autofilled')

                    // If the user changes the alias, remove the decoration
                    activeEl.addEventListener(
                        'input',
                        (e) => e.target.classList.remove('ddg-autofilled'),
                        {once: true}
                    )
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

const AndroidInterface = {
    isDeviceSignedIn: () => new Promise(resolve =>
        resolve((window.EmailInterface.isSignedIn() === 'true'))),
    trySigningIn: () => {
        if (window.origin.match(DDG_DOMAIN_REGEX)) {
            sendAndWaitForAnswer({signMeIn: true}, 'addUserData')
                .then(data => DeviceInterface.storeUserData(data))
        }
    },
    storeUserData: ({addUserData: {token, userName}}) =>
        window.EmailInterface.storeCredentials(token, userName),
    addDeviceListeners: () => {},
    addLogoutListener: () => {}
}

const DeviceInterface = isDDGApp() ? AndroidInterface : ExtensionInterface

module.exports = DeviceInterface
