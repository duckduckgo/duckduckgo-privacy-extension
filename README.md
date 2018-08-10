# DuckDuckGo Browser Extensions

[![Build Status](https://travis-ci.org/duckduckgo/duckduckgo-privacy-extension.svg?branch=develop)](https://travis-ci.org/duckduckgo/duckduckgo-privacy-extension)

DuckDuckGo Firefox, Chrome, and Safari extensions

This software is licensed under the terms of the Apache License, Version 2.0 (see LICENSE). Copyright (c) 2012 - 2017 [duckduckgo.com](https://duckduckgo.com)

## Pre-Requisites
- [Node.js](https://nodejs.org) installation
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html) and require:

## Set up development environment
- `npm install` from root directory

## Build
- Firefox:
 `npm run dev-firefox`
 Load the extension in Firefox from the `build/firefox/dev` directory
[Temporary installation in Firefox - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)

- Chrome:
 `npm run dev-chrome`
 Load the extension in Chrome from the `build/chrome/dev` directory
[Getting Started: Building a Chrome Extension - Google Chrome](https://developer.chrome.com/extensions/getstarted#unpacked)

- Safari:
`npm run dev-safari`

Load the extension in Safari from the `build/duckduckgo.safariextension/dev/duckduckgo.safariextension` directory using the [extension builder](https://developer.apple.com/library/content/documentation/Tools/Conceptual/SafariExtensionGuide/UsingExtensionBuilder/UsingExtensionBuilder.html)


## Development flow
Shared JS, CSS, and images are located in the `shared` directory. 

Popup: `shared/js/ui`
Background: `shared/js/` 

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The build files are located in `/build/<browser>/dev`. Point your browser to this location to load the extension:

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you. 

## Testing
- Unit tests can be run from the dev version of the extension by going to 
Firefox: `moz-extension://<yourExtensionID/test/index.html`
Chrome: `chrome-extension://<yourExtensionID/test/index/html`

An easy way to find your extension ID is to go to the `settings` page for the extension. The window URL will have the extension ID in it.

### Selenium Testing (ratings.js)

**Setup**

1. For remote linux machine, first setup xvbf: `source selenium-test/setup.sh`
2. `npm install`
3. `grunt`

**Testing Single Site** `./selenium-test/ratings.js -u https://website.com`

**Testing Top 500** `./selenium-test/ratings.js -n 2` (where n = [1 - 500])

**Testing Multiple Sites** `./selenium-test/ratings.js -f urls.txt` (file should have 1 url on each line)

**Using XVFB** To test on a remote server with XVBF installed, add `-x` flag: `./selenium-test/ratings.js -x -u https://website.com`

## Extension Development and Release Plan
** Please make an [issue](https://github.com/duckduckgo/duckduckgo-privacy-extension/issues/new) before working on any new features or bug fixes.**

## Development
- New features and bug fixes should be made against the `develop` branch

## Releasing New Versions
- Create a new branch off of `develop` with the format: `rc-<release version>`

### Chrome
- Update the manifest version in `browsers/chrome/manifest.json`
- Build a release version: `npm run release-chrome`
- Test `build/chrome/release` locally
- A date versioned zip file is automatically built  `build/chrome/release/chrome-release-YYYYMMDD-hhmmss.zip`
- Merge the release branch into master
- Upload the zip file to the Chrome store

### Firefox
- Update the manifest version in `browsers/firefox/manifest.json`
- Build a release version: `npm run release-firefox`
- Test `build/firefox/release` locally
- Merge the release branch to master
- Move to the release directory: `cd build/firefox/release`
- Use `web-ext` to package, sign, and upload to the Firefox Addon store
- `web-ext sign --api-key=$JWT_ISSUER --api-secret=$JWT_SECRET`

### Safari
- Update the version numbers in `browsers/duckduckgo.safariextension/Info.plist`. You need to update both `CFBundleVersion` and `CFBundleShortVersionString`.
- Build a release version. Follow the same build steps from the build section above. Use `npm run dev-safari`. 
- Test locally
- Before building a package with Safari extension builder you need to clear your company stats and localStorage otherwise your data will be packaged in the release version. 
In the extension console run `localStorage.clear()` and `Companies.resetData()`.
- Build a package through the extension builder.
