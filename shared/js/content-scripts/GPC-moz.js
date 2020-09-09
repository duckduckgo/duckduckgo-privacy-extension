(function setDOMSignal () {
    let contentWindow = window.wrappedJSObject;
    Object.defineProperty(contentWindow, "globalPrivacyControl", {
        value: globalPrivacyControlValue,
        configurable: false,
        writable: false
    });
})();

