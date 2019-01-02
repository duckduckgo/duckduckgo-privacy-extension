# Contributing guidelines

# Reporting broken sites

Report broken websites using the "Report Broken Site" link on the extension popup.

# Reporting bugs

- First check to see if the bug has not already been [reported]().
- Make sure that you are using the latest version of the extension.

**How to report a bug**
1. Use a short clear title that describes the issue.
2. Describe the steps required to reproduce the issue. Include screenshots if you think they would be helpful.
3. Include is your browser version, OS, and extension version.

Provide additional context (optional):
1. Is the issue repeatable or intermittent?
2. Did this issue start after an upgrade to a new extension version? If so, can you repeat it using a pervious extension version?
3. Are there any errors in the extension debugging console?

# Feature requests

There are two ways to submit feedback:
1. You can send anonymous feedback using the "Send feedback" link on the extension's options page.
2. You can submit your request as a GitHub issue.

**How to create a feature request issue**
1. First check to see that there isn't an existing issue that covers your request.
2. Use a short and descriptive title.
3. Explain why you would like to see this feature and why it would be useful.
4. Describe the current extension behavior and the expected behavior you would like to see.
5. Do you have any examples of other extensions that have this feature?

# Development

## New features

Right now all new feature development is handled internally.

## Bug fixes

Most bug fixes are handled internally, however, we will except pull requests for bug fixes if you:
1. Create an issue describing the bug. see Reporting bugs
2. Get approval from DDG staff before working on it. Since most bug fixes and feature development are handled internally, we want to make sure that your work doesn't conflict with an already progress project.

## Local Development

### Pre-Requisites
- [Node.js](https://nodejs.org) installation
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html).

### Set up development environment
- `npm install` from root directory

### Building the extension
- Firefox
 1. Run `npm run dev-firefox`
 2. Load the extension in Firefox from the `build/firefox/dev` directory
[Temporary installation in Firefox - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)

- Chrome
 1. Run `npm run dev-chrome`
 2. Load the extension in Chrome from the `build/chrome/dev` directory
[Getting Started: Building a Chrome Extension - Google Chrome](https://developer.chrome.com/extensions/getstarted#unpacked)

- Safari

  The Safari extension is no longer supported.


### Development flow

The `shared` directory contains JS, CSS, and images that are shared by all browsers.

The popup UI is in `shared/js/ui`

The background JS is in `shared/js/`

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The generated build files are located in `/build/<browser>/dev`.

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you.

### Testing
- `npm test`

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
**See [contributing]() before working on any bug fixes. New features are not accepted at this time**

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
- The Safari extension is no longer supported.
