(() => {
    // Polyfills/shims
    require('intersection-observer')
    require('./requestIdleCallback')
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
