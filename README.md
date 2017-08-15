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
Runs build task and then watch task that watches /css/**/*.scss and /js/**/*.es6.js files
- `$ npm run dev`

## Testing
- Do steps in "Set up development environment" above
- `$ npm test`

# Extension Development and Release Plan

## Adding New Features

- All new features should be build on the `beta` branch in chrome-zeroclickinfo
- Any Firefox specific features should be built on the `beta-firefox` branch in chrome-zeroclickinfo
- The `beta` branch will be periodically merged into `beta-firefox` to keep the two extensions up to date with each other

## Releasing New Versions

### Chrome

- The chrome version is built from the `beta` branch in chrome-zeroclickinfo
1. remove any unneeded directories. Specifically the .git and node_modules.
2. bump the version number in `manifest.json`
3. zip the directory. `zip chrome-zeroclickinfo.zip -r ./*`
4. submit to the chrome store

### Firefox

We're building an embedded Firefox extension using our current extension in firefox-zeroclickinfo and the `beta-firefox` branch of chrome-zeroclickinfo. This allows us to keep the default search engine feature of our current Firefox extension and include all the new features of the chrome extension.

1. Assuming you have the following directory structure

```
└──YourExtensionsDirectory
        ├── chrome-zeroclickinfo
        ├── firefox-zeroclickinfo
```

2. in firefox-zeroclickinfo checkout the branch `beta-webextension`
3. checkout the `firefox-beta` branch in chrome-zeroclickinfo by running: `cd webextension && git checkout beta-firefox && cd ..`
4. bump the version number in package.json. Make sure that the version has "beta" on the end. ex: 1.1.5.beta
5. sign the extension using JPM


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

#### Troubleshooting Firefox

As a developer who may be using more than one install of Firefox browser locally (for example, you might have the Nightly build installed along with your regular FF instance), you might run across this cryptica error when running the background page of this extension: 
```
"IndexedDB UnknownErr: ActorsParent.cpp:595"
```
If this should happen to you, you'll need to create a new (empty) Firefox profile on your machine to develop against. Here is a link that describes how to create a new empty profile:
https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles

...And here is a link to the open bug in Mozilla's bug tracking system about this:
https://bugzilla.mozilla.org/show_bug.cgi?id=1246615
