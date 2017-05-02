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
- `$ git submodule init` to pull in EFF's https-everywhere project
- `$ git submodule update`

## Build
- `$ npm run build`

## Development flow
Runs build task and then watch task that watches /css/**/*.scss and /js/**/*.es6.js files
- `$ npm run dev`

## Testing
- Do steps in "Set up development environment" above
- `$ npm test`

