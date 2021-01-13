(() => {
    // Polyfills/shims
    require('intersection-observer')
    require('./requestIdleCallback')
    require('@webcomponents/webcomponentsjs')
    const DeviceInterface = require('./DeviceInterface')
    const scanForInputs = require('./scanForInputs.js')

    DeviceInterface.addDeviceListeners()
    DeviceInterface.isDeviceSignedIn().then(deviceSignedIn => {
        if (deviceSignedIn) {
            scanForInputs(DeviceInterface)
        } else {
            DeviceInterface.trySigningIn()
        }
    })
})()
