(function setDOMSignal () {
    const scriptString = `
        Object.defineProperty(navigator, "globalPrivacyControl", {
            value: ${globalPrivacyControlValue},
            configurable: false,
            writable: false
        });
        document.currentScript.parentElement.removeChild(document.currentScript);
        `;
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = scriptString;
    document.documentElement.prepend(scriptElement);
})();
    
