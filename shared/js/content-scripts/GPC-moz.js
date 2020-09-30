(function setDOMSignal () {
    let wrappedNavigator = navigator.wrappedJSObject;
    Object.defineProperty(wrappedNavigator, "globalPrivacyControl", {
        value: globalPrivacyControlValue,
        configurable: false,
        writable: false
    });
})();

