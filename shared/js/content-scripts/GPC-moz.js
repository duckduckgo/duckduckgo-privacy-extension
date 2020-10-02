// Set Global Privacy Control property on DOM
(function setDOMSignal () {
    let wrappedNavigator = navigator.wrappedJSObject;
    // Catch errors if signal is already set by user agent or other extension
    try {
        Object.defineProperty(wrappedNavigator, "globalPrivacyControl", {
            value: globalPrivacyControlValue,
            enumerable: true
        });
    } catch(e) {};
})();

