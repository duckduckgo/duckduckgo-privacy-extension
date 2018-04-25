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

// NOTE: this needs to be the first thing that's require()d when the extension loads.
// otherwise FF might miss the onInstalled event
const events = require('./$BROWSER-events.es6')
const settings = require('./settings.es6')

settings.ready().then(() => {
    // clearing last search on browser startup
    settings.updateSetting('last_search', '')

    var os = 'o'
    if (window.navigator.userAgent.indexOf('Windows') !== -1) os = 'w'
    if (window.navigator.userAgent.indexOf('Mac') !== -1) os = 'm'
    if (window.navigator.userAgent.indexOf('Linux') !== -1) os = 'l'

    localStorage['os'] = os

    events.onStartup()
})
