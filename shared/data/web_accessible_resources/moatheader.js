//z.moatads.com/moatheader.js application/javascript
(() => {
    if (!('moatPrebidApi' in window)) {
        window.moatPrebidApi = {}
    }

    [
        'slotDataAvailable',
        'pageDataAvailable',
        'safetyDataAvailable',
        'enableLogging',
        'disableLogging',
        'setMoatTargetingForSlot',
        'setMoatTargetingForAllSlots',
        'getMoatTargetingForSlot',
        'getMoatTargetingForPage',
        '__A',
        '__B',
        '__C'
    ].forEach((methodName) => {
        window.moatPrebidApi[methodName] = () => { return false }
    })
})()
