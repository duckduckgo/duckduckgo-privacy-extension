# DuckDuckGo for Chrome

This is the official Chrome Extension for DuckDuckGo. You can install this extension directly from the [Chrome web store](https://chrome.google.com/webstore/detail/duckduckgo-for-chrome/bpphkkgodbfncbcpgopijlfakfgmclao?hl=en).

This software is licensed under the terms of the Apache License, Version 2.0 (see LICENSE). Copyright (c) 2012 - 2017 [duckduckgo.com](https://duckduckgo.com)

# Contributing

## Pre-Requisites

- [Node.js](https://nodejs.org) installation
- Tests use [Selenium Webdriver](http://seleniumhq.github.io/selenium/docs/api/javascript/index.html) and require:
- A Google Chrome executable (you must have the browser installed on your machine)

## Set up development environment

- `$ npm install` from root directory

## Build

- `$ npm run build`

## Development flow

Runs build task and then watch task that watches `/css/**/*.scss` and `/js/**/*.es6.js` files

- `$ npm run dev`

## Testing

- Do steps in "Set up development environment" above
- `$ npm test`

### Selenium Testing (ratings.js)

**Setup**

1. For remote linux machine, first setup xvbf: `source selenium-test/setup.sh`
2. `npm install`
3. `grunt`

**Testing Single Site** `./selenium-test/ratings.js -u https://website.com`

**Testing Top 500** `./selenium-test/ratings.js -n 2` (where n = [1 - 500])

**Testing Multiple Sites** `./selenium-test/ratings.js -f urls.txt` (file should have 1 url on each line)

**Using XVFB** To test on a remote server with XVBF installed, add `-x` flag: `./selenium-test/ratings.js -x -u https://website.com`

# Extension Development and Release Plan

## Adding New Features

- All new features should be build on the `beta` branch in chrome-zeroclickinfo
- Any Firefox specific features should be built on the `beta-firefox` branch in chrome-zeroclickinfo
- The `beta` branch will be periodically merged into `beta-firefox` to keep the two extensions up to date with each other

## Releasing New Versions

### Chrome

- The chrome version is built from the `beta` branch in chrome-zeroclickinfo
- remove any unneeded directories. Specifically the .git and node_modules.
- bump the version number in `manifest.json`
- zip the directory. `zip chrome-zeroclickinfo.zip -r ./*`
- submit to the chrome store

### Firefox

We're building an embedded Firefox extension using our current extension in firefox-zeroclickinfo and the `beta-firefox` branch of chrome-zeroclickinfo. This allows us to keep the default search engine feature of our current Firefox extension and include all the new features of the chrome extension.

1. Assuming you have the following directory structure

```
└──YourExtensionsDirectory
        ├── chrome-zeroclickinfo
        ├── firefox-zeroclickinfo
```

1. in firefox-zeroclickinfo checkout the branch `beta-webextension`
2. checkout the `firefox-beta` branch in chrome-zeroclickinfo by running: `cd webextension && git checkout beta-firefox && cd ..`
3. bump the version number in package.json. Make sure that the version has "beta" on the end. ex: 1.1.5.beta
4. sign the extension using JPM

```
┌───────────────────────────────┐                                ┌───────────────────────────────┐
│chrome-zeroclickinfo           │                                │firefox-zeroclickinfo          │
├───────────────────────────────┤                                ├───────────────────────────────┤
│                               │                                │                               │
│     ┌─────────────────────┐   │                                │ Branch: beta-webextension     │
│  ┌──│Branch: beta         │◀──┼─────── new features            │                               │
│  │  └─────────────────────┘   │                                │     ┌────────────────────────┐│
│  │                            │                                │     │Legacy extension        ││
│  │                            │       new firefox specific     │     │                        ││
│  │merge         ┌─────────────┼───────      features           │     │                        ││
│  │              │             │                                │     │    ┌─────────────────┐ ││
│  │              ▼             │                                │     │    │                 │ ││
│  │   ┌─────────────────────┐  │                                │     │    │    embedded     │ ││
│  └──▶│Branch: beta-firefox │◀─┼────────────────────────────────┼─────┼────│  webextension   │ ││
│      └─────────────────────┘  │                symlinked       │     │    │                 │ ││
│                               │                                │     │    └─────────────────┘ ││
└───────────────────────────────┘                                │     └────────────────────────┘│
                                                                 └───────────────────────────────┘
```
