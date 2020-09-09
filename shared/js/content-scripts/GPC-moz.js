(function setDOMSignal () {
    if (!navigator.globalPrivacyControl) {
        let frameNavigator = navigator.wrappedJSObject;
        Object.defineProperty(frameNavigator, "globalPrivacyControl", {
            value: globalPrivacyControlValue,
            configurable: false,
            writable: false
        });
    }
})();

