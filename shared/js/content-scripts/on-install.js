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
function getATB () {
    return document.querySelector('html').getAttribute('data-chromeatb') || document.querySelector('html').getAttribute('data-atb')
}

if (window.safari) {
    // in Safari we can't inject a script whenever we want, so instead add it everywhere
    // and wait for the background process to tell us when to execute it
    document.addEventListener('DOMContentLoaded', function (e) {
        if (window !== window.top) return

        window.safari.self.addEventListener('message', function (e) {
            if (e.name !== 'getATB') return

            let atb = getATB()
            if (atb) {
                window.safari.self.tab.dispatchMessage('atb', {atb: atb})
            }
        })
    }, true)
} else {
    chrome.runtime.sendMessage({atb: getATB()})
}
