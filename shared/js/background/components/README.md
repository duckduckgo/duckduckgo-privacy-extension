# Extension Components

This folder contains 'Component' classes for the extension. This is an architectural construct to allow us to move the extension code to a more modular architecture, and better handle platform differences.

Here, a component is a module that exports a class. All components are initialized when the extension's background or service worker is started. Any singleton or component dependencies are provided to the constructor. This allows components to depend on each other, but avoids explicit imports of these dependencies.

Component initialization is done in [background.js](../background.js). Depending on the build target or other conditions we can include or exclude components at build or runtime. All components are added to the `components` global, so they can be inspected at runtime via the debugger. All components can run some initialization code on the first tick of the background (which is important for registering listeners in MV3).

## Why use components?

 - They give us more control over which features are included in builds, and when they're initialized. By moving the initialization point from 'on import' to 'on class construction', we allow this code to be tree-shaked when it is not used by a build. This is important as we use the extension in different environments which support different APIs. Also, the initialization order is explicitly defined in the background script, rather than the order than modules were imported.
 - They're easier to test. As dependences are injected, rather than imported, mocking those dependencies for testing is trivial.
 - They discourage singleton usage, making code easier to understand and more maintainable.

## List of components

 - `FireButton`: Registers event listeners needed for the Fire button. Included on Chrome only.
 - `MV3ContentScriptInjection`: MV3-specific content-script registration. Exposes a `ready` property, which is a Promise that resolved when scripts are registered.
 - `TabTracker`: Registers event listeners to track tab metadata and updates the legacy `tabManager` singleton.

## Example component

```javascript
export default class MyComponent {
    /**
     * The constructor will get called when the extension background starts up, so this is the best place
     * to register listeners. If you depend on other components/singletons, you should pass them in via the
     * constructor. You can use JSDoc to have these objects typed:
     * @param {{
     *  settings: import('../settings.js')
     *  tabManager: import('../tab-manager.js')
     * }}
     */
    constructor ({ settings, tabManager }) {
        // register listeners here, e.g.
        chrome.webRequest.onBeforeRequest.addListener(...)
        // You can register handlers on the global message handler with `registerMessageHandler`
        registerMessageHandler('myHandler', this.handleMessage.bind(this))
        // We can also do async initialization, if we need to wait for other components to be ready.
        // By assigning this to a class attribute, other components can track when this initialization is complete.
        this.ready = settings.ready().then(() => this.init())
    }

    init () {
    }

    handleMessage () {
    }
}
```
