document.addEventListener('readystatechange', (event) => {
    if (!navigator.PRIV) {
        let frameNavigator = navigator.wrappedJSObject;
        Object.defineProperty(frameNavigator, "PRIV", {
            value: "1",
            configurable: false,
            writable: false
        })
    }
});

