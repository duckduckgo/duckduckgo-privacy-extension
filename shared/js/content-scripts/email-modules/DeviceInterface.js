const DDGAutofill = require('./DDGAutofill')
const {DDG_DOMAIN_REGEX, sendAndWaitForAnswer} = require('./autofill-utils')
const scanForInputs = require('./scanForInputs.js')
const {setValue} = require('./autofill-utils')
const {notifyWebApp} = require('./autofill-utils')
const {isDDGApp} = require('./autofill-utils')

const SIGN_IN_MSG = {
    signMeIn: true,
    extensionInstalled: true // TODO: deprecated, to be removed in a future release
}

const ExtensionInterface = {
    isDeviceSignedIn: () => new Promise(resolve => chrome.runtime.sendMessage(
        {getSetting: {name: 'userData'}},
        userData => resolve(!!(userData && userData.nextAlias))
    )),
    trySigningIn: () => {
        if (window.origin.match(DDG_DOMAIN_REGEX)) {
            sendAndWaitForAnswer(SIGN_IN_MSG, 'addUserData')
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
    },
    attachTooltip: (form, input) => {
        if (form.tooltip) return

        form.tooltip = new DDGAutofill(input, form)
        document.body.appendChild(form.tooltip)
        form.intObs.observe(input)
        window.addEventListener('mousedown', form.removeTooltip, {capture: true})
    }
}

const AndroidInterface = {
    isDeviceSignedIn: () => new Promise(resolve =>
        resolve((window.EmailInterface.isSignedIn() === 'true'))),
    trySigningIn: () => {
        if (window.origin.match(DDG_DOMAIN_REGEX)) {
            sendAndWaitForAnswer(SIGN_IN_MSG, 'addUserData')
                .then(data => {
                    notifyWebApp({deviceSignedIn: {value: true}})
                    DeviceInterface.storeUserData(data)
                })
        }
    },
    storeUserData: ({addUserData: {token, userName}}) =>
        window.EmailInterface.storeCredentials(token, userName),
    addDeviceListeners: () => {},
    addLogoutListener: () => {},
    attachTooltip: (form, input) => {
        form.activeInput = input
        sendAndWaitForAnswer(() => window.EmailInterface.showTooltip(), 'getAliasResponse')
            .then(res => {
                if (res.alias) form.autofill(res.alias)
                else form.activeInput.focus()
            })
    }
}

const DeviceInterface = isDDGApp() ? AndroidInterface : ExtensionInterface

module.exports = DeviceInterface
