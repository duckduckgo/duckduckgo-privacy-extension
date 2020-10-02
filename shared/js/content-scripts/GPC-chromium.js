// Set Global Privacy Control property on DOM
(function setDOMSignal () {
    const scriptString = `
        // Catch errors if signal is already set by user agent or other extension
        try {
            Object.defineProperty(navigator, "globalPrivacyControl", {
                value: ${globalPrivacyControlValue},
                enumerable: true
            });
            // Remove script tag after execution
            document.currentScript.parentElement.removeChild(document.currentScript);
        } catch(e) {};
        `;
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = scriptString;
    document.documentElement.prepend(scriptElement);
})();
    
