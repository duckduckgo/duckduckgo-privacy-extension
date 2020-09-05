(function setDOMSignal () {
    const scriptString = `
        Object.defineProperty(navigator, "PRIV", {
            value: "1",
            configurable: false,
            writable: false
        });
        document.currentScript.parentElement.removeChild(document.currentScript);
        `;
    const scriptElement = document.createElement('script');
    scriptElement.innerHTML = scriptString;
    document.documentElement.prepend(scriptElement);
})();
    
