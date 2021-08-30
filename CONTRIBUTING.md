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
- [grunt-cli](https://gruntjs.com/getting-started)
- grunt-cli can be installed by running `npm install -g grunt-cli`
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html).

### Building the extension
- `npm install` has to be run before building the extension for the first time 
- Firefox
 1. Run `npm run dev-firefox`
 2. Load the extension in Firefox from the `build/firefox/dev` directory
[Temporary installation in Firefox - Mozilla | MDN](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox)
    Alternatively running `web-ext run -s build/firefox/dev` loads the extension into a temporary profile.

- Chrome
 1. Run `npm run dev-chrome`
 2. Load the extension in Chrome from the `build/chrome/dev` directory
[Getting Started: Building a Chrome Extension - Google Chrome](https://developer.chrome.com/extensions/getstarted#unpacked)

### Safari web extension

To build the next-gen web extension for Safari, you need the Xcode 13 beta (when you're reading this it might already be released), the related Command Line Tools and Safari 15 beta or Technology Preview. You can find them all here: https://developer.apple.com/download/all/.

If you need to recreate the project from scratch, switch the default CLI to the beta version by running:

```bash
sudo xcode-select -switch <path/to/>Xcode-beta.app
xcode-select --print-path
```

Now run

```bash
nvm use && npm install && npm run dev-safari14
```

Let it complete (when you see waiting...) and run:

```bash
xcrun safari-web-extension-converter build/safari14/dev/
```

This will build the Safari project for both iOS and macOS and open Xcode. There are a couple manual steps from here:

- Open `Main.storyboard` and rename button to "Open Safari Extensions Preferences…"
- "Hardened Runtime" should be enabled by default in this new Xcode. If not, enable it by selecting the project (the top item in the list in the left menu). For each of the "Targets" in the project editor (**both** the app and the extension)
  - Select "Signing & Capabilities"
  - Check the "Apple Events" from the "Resource Access" list
- Set team and signing certificate for each of the "Targets" in the project editor (**both** the app and the extension)
  - Team should be "Duck Duck Go, Inc."
  - Signing Certificate should be "Development"

You can now compile the bundle in Xcode by clicking on the ▶️ icon or hitting `cmd+r`. Remember to enable the extension in the Safari settings.

When you want to distribute your `.app` file, you can wrap it as a `.dmg`, which is a common way to distribute macOS apps. You can find the `.app` bundle by cmd+clicking on the app extension when it's open. Using [the `create-dmg` tool](https://github.com/create-dmg/create-dmg), from within the same directory as the `.app` file, run:

```bash
mkdir -p temp && cp -r *.app temp && create-dmg --volname "DuckDuckGo Privacy Essentials for Safari" --icon "DuckDuckGo Privacy Essentials for Safari.app" 200 190 --window-size 800 400 --icon-size 100 --app-drop-link 600 185 "DuckDuckGo Privacy Essentials for Safari.dmg" temp && rm -rf temp
```

This will copy the app bundle in a subfolder, create the `.dmg`, and then remove the temporary subfolder.

### Development flow

The `shared` directory contains JS, CSS, and images that are shared by all browsers.

The popup UI is in `shared/js/ui`

The background JS is in `shared/js/`

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The generated build files are located in `/build/<browser>/dev`.

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you.

### Testing
- Install the required test submodules: `git submodule update --init --recursive`
- Unit tests: `npm test`
- Integration Tests
  - Local, requires Chrome: `npm run test-int`
    - You can filter to one test with: `KEEP_OPEN=1 npm run test-int -- -f integration-test/background/test-fp-fingerprint.js`
  - Headless, requires xvfb: `npm run test-ci`

### Selenium Testing (ratings.js)

**Setup**

1. For remote linux machine, first setup xvfb: `source selenium-test/setup.sh`
2. `npm install`
3. `grunt`

**Testing Single Site** `./selenium-test/ratings.js -u https://website.com`

**Testing Top 500** `./selenium-test/ratings.js -n 2` (where n = [1 - 500])

**Testing Multiple Sites** `./selenium-test/ratings.js -f urls.txt` (file should have 1 url on each line)

**Using XVFB** To test on a remote server with XVBF installed, add `-x` flag: `./selenium-test/ratings.js -x -u https://website.com`
