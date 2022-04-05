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

## Updating git submodules

Run `git submodule update --remote` to fetch latest version of all git submodules.

## Testing locally

### Pre-Requisites
- [Node.js](https://nodejs.org) installation
- [grunt-cli](https://gruntjs.com/getting-started)
- grunt-cli can be installed by running `npm install -g grunt-cli`
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html).

### Building the extension
- `npm install`, `git submodule update --init --recursive` both have to be run before building the extension for the first time 
- Firefox
 1. Run `npm run dev-firefox`
 2. Load the extension in Firefox from the `build/firefox/dev` directory
[Temporary installation in Firefox - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)
    Alternatively running `web-ext run -s build/firefox/dev` loads the extension into a temporary profile.

- Chrome
 1. Run `npm run dev-chrome`
 2. Load the extension in Chrome from the `build/chrome/dev` directory
[Getting Started: Building a Chrome Extension - Google Chrome](https://developer.chrome.com/extensions/getstarted#unpacked)

### Updating or testing config

Modify shared/data/constants.js the config to point to http://localhost:8080/generated/extension-config.json

Serve the config locally and also bundle it into the extension.

```
cd /dir/to/privacy-configuration
node index.js
http-server
cd -
npm run bundle-config
```

### Development flow

The `shared` directory contains JS, CSS, and images that are shared by all browsers.

The popup UI is in `shared/js/ui`

The background JS is in `shared/js/`

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The generated build files are located in `/build/<browser>/dev`.

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you.

### Locally testing changes to modules

The extension imports several DDG-owned modules (see [package.json](https://github.com/duckduckgo/duckduckgo-privacy-extension/blob/7a5616b5c54155a99f79c672e007785f76a8d3ee/package.json#L75-L78)). If you need to locally test changes to these modules follow these steps.

1. Set the extension to resolve the module locally:
    1. In the local directory of the module (e.g., `content-scope-scripts`) run
       `npm link`.
    2. In the extension directory run `npm link @duckduckgo/<module_name>`
    3. Verify that the link succeeded. You should see a symlink for the module in
       question when you run `ls -al node_modules/@duckduckgo/` from the
       extension directory.
2. Manually run the module's build step (e.g., `npm run build`)
3. Manually run the extension's build command (e.g. `make dev browser=firefox
   type=dev`). Running `npm run dev-firefox` will overwrite the symlink back to
   the remote module.

### Testing
- Unit tests: `npm test`
- Integration Tests
  - Local, requires Chrome: `npm run test-int`
    - You can filter to one test with: `KEEP_OPEN=1 npm run test-int -- -f integration-test/background/test-fp-fingerprint.js`
  - Headless, requires xvfb: `npm run test-ci`

### Selenium Testing (ratings.js)

**Setup**

1. For remote linux machine, first setup xvfb: `source selenium-test/setup.sh`
2. `npm install`, `git submodule update --init --recursive`
3. `grunt`

**Testing Single Site** `./selenium-test/ratings.js -u https://website.com`

**Testing Top 500** `./selenium-test/ratings.js -n 2` (where n = [1 - 500])

**Testing Multiple Sites** `./selenium-test/ratings.js -f urls.txt` (file should have 1 url on each line)

**Using XVFB** To test on a remote server with XVBF installed, add `-x` flag: `./selenium-test/ratings.js -x -u https://website.com`
