/*
 * Copyright (C) 2012, 2016 DuckDuckGo, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* global DEBUG, RELOADER, BUILD_TARGET */

import { onStartup } from './startup'
import FireButton from './components/fire-button'
import initDebugBuild from './devbuild'
import initReloader from './devbuild-reloader'
import tabManager from './tab-manager'
// NOTE: this needs to be the first thing that's require()d when the extension loads.
// otherwise FF might miss the onInstalled event
require('./events')
const settings = require('./settings')
if (BUILD_TARGET === 'chrome-mv3') {
    require('./dnr-config-rulesets')
    require('./script-injection')
}

settings.ready().then(() => {
    onStartup()
})

/**
 * @type {{
 *  fireButton?: FireButton;
 * }}
 */
const components = {}

if (BUILD_TARGET === 'chrome' || BUILD_TARGET === 'chrome-mv3') {
    components.fireButton = new FireButton({ settings, tabManager })
}
console.log('Loaded components:', components)
// @ts-ignore
self.components = components

// Optional features controlled by build flags.
// If these flags are set to false, the whole function is tree-shaked from the build.
DEBUG && initDebugBuild()
RELOADER && initReloader()
