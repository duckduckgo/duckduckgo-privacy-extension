**Safari Popup UX**

*Background Data*
- You still access background data through `fetch`. For Safari the internals of this method are a little different. Background data is accessed directly instead of through message passing. `safari.extension.globalPage.contentWindow`

*Links*
- Use `href="javascript:void(0)"` instead of `href="#"`
- Don't use `target="_blank"`

**Safari api vs webextension api**

The Safari extension injects a content script into each page. The main job of this script is to pass web requests to the background to check for and block trackers.

*Content script*
- beforeUnload
    This is similar to chrome.tabs.onRemoved that is used to clean up tab         data when the tabs is closed.

- beforeLoad
    This catches the web requests and runs the Safari canLoad method         which passes the request data to the background

*Background*
- beforeNavigate
    Used for upgrading main frame HTTP requests. Currently Disabled.

- beforeSearch
    Used for adding ATB parameters. Only to omnibar requests. ATB does     not work from other requests.

- canLoadRuns onBeforeRequest tracker blocking

**Safari Tabs**

Safari gives you direct access to their native tabs through 
`safari.application.activeBrowserWindow.activeTab`

Safari tabs are not assigned a unique ID and much of the webextension code relies on web requests coming through with a tab ID. To handle this we will generate and store random tab ID in the Safari tab object. 
When we get a canLoad event we will check to see if the Safari target tab contains a `ddgTabId` and generate one if it doesn't. These tab IDs persist for the life of the Safari tab.

**Back and Forward Caching**

Safari will sometimes load a cached page when using the back or forward button. Loading the cached page doesn't fire the beforeLoad event that we use to generate new tab data for the popup. To handle this we storing the ddg tab objects inside of the Safari tab. Example:
`safari.application.activeBrowserWindow.activeTab`
`ddgCache: {https://www.reddit.com/: Tab, https://github.com/: Tab}`
