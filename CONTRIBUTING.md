# Contributing guidelines

# Reporting broken sites

Report broken websites using the "Report Broken Site" link on the extension popup.

# Reporting bugs

1. First check to see if the bug has not already been [reported](https://github.com/duckduckgo/duckduckgo-privacy-extension/issues).
2. Create a bug report [issue](https://github.com/duckduckgo/duckduckgo-privacy-extension/issues/new?template=bug_report.md).

# Feature requests

There are two ways to submit feedback:
1. You can send anonymous feedback using the "Send feedback" link on the extension's options page.
2. You can submit your request as an [issue](https://github.com/duckduckgo/duckduckgo-privacy-extension/issues/new?template=feature_request.md). First check to see if the feature has not already been [suggested](https://github.com/duckduckgo/duckduckgo-privacy-extension/issues).

# Development

## New features

Right now all new feature development is handled internally.

## Bug fixes

Most bug fixes are handled internally, but we will except pull requests for bug fixes if you first:
1. Create an issue describing the bug. see [Reporting bugs](CONTRIBUTING.md#reporting-bugs)
2. Get approval from DDG staff before working on it. Since most bug fixes and feature development are handled internally, we want to make sure that your work doesn't conflict with any current projects.

## Testing locally

### Pre-Requisites
- [Node.js](https://nodejs.org) installation

### Building the extension

#### Development builds

- Run `npm install` before building the extension for the first time.
- Firefox
 1. Run `npm run dev-firefox`
 2. Load the extension in Firefox from the `build/firefox/dev` directory
[Temporary installation in Firefox - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)
    Alternatively running `web-ext run -s build/firefox/dev` loads the extension into a temporary profile.

- Chrome
 1. Run `npm run dev-chrome`
 2. Load the extension in Chrome from the `build/chrome/dev` directory
[Getting Started: Building a Chrome Extension - Google Chrome](https://developer.chrome.com/extensions/getstarted#unpacked)

Note: Development builds of the extension have a few differences from the release builds and are more convenient to use during development:
 - The background page/ServiceWorker has an `dbg` Object that provides access to some of the extension's internal configuration and other state.
 - Click to Load placeholders are created with an open shadowRoot, instead of a closed shadowRoot. This allows the integration tests to click the placeholder's buttons reliably.
 - `test=1` parameter is added to the uninstall URL and to requests for the extension configuration.

#### Release builds

- Release builds can be produced in much the same was as the development builds, but by using the `npm run release-chrome` and `npm run release-firefox` commands.
- These builds are stored in the `build/chrome/release` and `build/firefox/release` directories respectively.

### Updating or testing config

Modify shared/data/constants.js the config to point to http://localhost:8080/generated/v2/extension-config.json

Serve the config locally and also bundle it into the extension.

```
cd /dir/to/privacy-configuration
node index.js
http-server
cd -
npm run bundle-config
```

### Development flow

The `shared` directory contains JS, CSS, and images that are shared by all browsers for things like the options
page and the dev-tools panel. 

The popup UI comes from [`@duckduckgo/privacy-dashboard`](https://github.com/duckduckgo/privacy-dashboard) - we use `npm`
to install this package. At build time we copy the pre-built assets from the Dashboard into the extensions output folder. 
To make changes to the dashboard, see the section below [Locally testing changes to modules](#locally-testing-changes-to-modules).
The Dashboard also publishes extension-specific [documentation](https://duckduckgo.github.io/privacy-dashboard/modules/Browser_Extensions_integration.html)   

The background JS is in `shared/js/`

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The generated build files are located in `/build/<browser>/dev`.

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you. If a dev build is running in a browser, it should also automatically reload itself after being rebuilt.

Notes:
  - If you want to create a developer build once _without_ watching for future changes, use the Makefile directly (e.g. `make dev browser=chrome type=dev`).
  - If you want to disable automatic extension reloading, pass the `reloader=0` build parameter. (e.g. `npm run dev-chrome reloader=0` or `make dev browser=chrome type=dev reloader=0`).

### Locally testing changes to modules

The extension imports several DDG-owned modules (see [package.json](https://github.com/duckduckgo/duckduckgo-privacy-extension/blob/7a5616b5c54155a99f79c672e007785f76a8d3ee/package.json#L75-L78)). If you need to locally test changes to these modules follow these steps.

1. Set the extension to resolve the module locally:
    1. In the local directory of the module (e.g., `content-scope-scripts`) run `npm link`.
    2. In the extension directory run `npm link @duckduckgo/<module_name>`
    3. Verify that the link succeeded. You should see a symlink for the module in question when you run `ls -al node_modules/@duckduckgo/` from the extension directory.
2. Manually run the module's build step (e.g., `npm run build`) - (If you're running a watch command like dev-chrome or dev-firefox you can skip this step).
3. Manually run the extension's build command (e.g. `npm run dev-firefox`)

### Linting
- All linting: `npm run lint`
    - This includes both the ESLint and TypeScript checks.
- ESLint linting: `npm run eslint`
    - To automatically fix mistakes found (where possible) use: `npm run eslint-fix`
- TypeScript Linting: `npm run tsc`

### Testing
- Unit tests: `npm test` (full docs [here](./unit-test/README.md))
- Integration tests: `npm run playwright` and `npm run playwright-mv2` (full docs [here](./integration-test/README.md))
