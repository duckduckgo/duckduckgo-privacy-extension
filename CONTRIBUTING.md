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
- [Grunt](https://www.npmjs.com/package/grunt)
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html).

### Working with the autofill submodule

This repo uses a dependency that's included via a subrepo. To initialise the subrepo run:

```shell
git submodule update --init --recursive
```

See [Git submodule helpers](#-git-submodule-helpers) to simplify this command into `git supdate`.

#### Changes to `git pull`

When running `git pull` in the parent project git will also fetch submodule changes, but it will not commit them. To make sure your local code reflects the intended upstream state, you can run:

```shell
git pull --recurse-submodules
```

This makes sure the submodule version committed upstream is included in the local submodule.

See [Git submodule helpers](#-git-submodule-helpers) to automate this when you run `git pull`.

#### Work with a different submodule branch

You can simply `cd` to the subrepo and checkout a different branch.

If you want this branch to become the new stable channel for this project, you can run:

```shell
git config -f .gitmodules submodule.duckduckgo-autofill.branch your-new-branch
```

This will save the branch reference to the `.gitmodules` file. You can then commit this change and push it upstream so that it's available to all contributors.

#### Git submodule helpers

We've created a `.gitconfig` to help you automate some of these git commands. To take advantage of these commands and helpers, just run this from the root of this project.

```shell
git config --local include.path ../.gitconfig
```

Using git from a gui also simplifies working with submodules 😉.

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

- Safari 14 Email Autofill

This is a cut-down version of the extension specifically to support email autofill in Safari 14.

Follow these instructions to make sure that your Safari has development settings enabled: https://developer.apple.com/documentation/safariservices/safari_app_extensions/building_a_safari_app_extension#2957926

ℹ️ **Remember:** The "Allow Unsigned Extensions" setting is reset when you quit Safari; you must set it again the next time Safari is launched!

 1. Run `npm run dev-safari14-email-autofill`
 2. Open the extension project in Xcode, which can be found at `browsers/safari14-email-autofill-xcode-project/DuckDuckGo Email Protection`
 3. Build the extension through Xcode (the "play" button in the toolbar), which will build and run the wrapping macOS app
 4. Make sure the extension is enabled by clicking the "Open Safari Extensions Preferences" button in the DuckDuckGo Email Protection app
 5. The extension icon should now be visible to the left of the URL bar in Safari

In the event that the Xcode project needs to be recreated, this can be done using the conversion tool.
```
# Remove the existing project
cd ./browsers/safari14-email-autofill-xcode-project
rm -rf DuckDuckGo\ Email\ Protection

# Run the build and ctrl+c when "Waiting..."
npm run dev-safari14-email-autofill

# In the `safari14-email-autofill-xcode-project` directory, run the Safari web extension convertor
/Applications/Xcode.app/Contents/Developer/usr/bin/safari-web-extension-converter ../../build/safari14-email-autofill/dev/

# Non-default changes
# App Bundle Identifier: com.duckduckgo.DuckDuckGo-Email-Protection
```
Please note, that there are manual changes which will need to be applied after conversion:
 - Open `Main.storyboard` and rename button to "Open Safari Extensions Preferences…"
 - Enable "Hardened Runtime" by selecting the project (the top item in the list in the left menu). For each of the "Targets" in the project editor (**both** the app and the extension)
    - Select "Signing & Capabilities", and then "+ Capability"
    - Search and add "Hardened Runtime"
    - Check the "Apple Events" from the "Resource Access" list
 - Set team and signing certificate for each of the "Targets" in the project editor (**both** the app and the extension)
    - Team should be "Duck Duck Go, Inc."
    - Signing Certificate should be "Development"

When you want to distribute your `.app` file, you can wrap it as a `.dmg`, which will make sure that the end user copies the `.app` file into the Application directory. Using [the `create-dmg` tool](https://github.com/create-dmg/create-dmg), from within the same directory as the `.app` file, run:
```
create-dmg --volname "DuckDuckGo Email Protection" --icon "DuckDuckGo Email Protection.app" 200 190 --window-size 800 400 --icon-size 100 --app-drop-link 600 185 "DuckDuckGo Email Protection.dmg"
```

### Development flow

The `shared` directory contains JS, CSS, and images that are shared by all browsers.

The popup UI is in `shared/js/ui`

The background JS is in `shared/js/`

Browser specific files, including manifest files, are located in `browsers/<browser-name>`

Run the dev build task for your browser from the 'Build' section above. The generated build files are located in `/build/<browser>/dev`.

After running the build task it will continue watching for changes to any of the source files. After saving any changes to these files it will automatically rebuild the `dev` directory for you.

### Testing
- Unit tests: `npm test`
- Integration Tests
  - Local, requires Chrome: `npm run test-int`
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
