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
    return document.querySelector('html').getAttribute('data-chromeatb') || document.querySelector('html').getAttribute('data-atb');
}

if (window.safari) {
    document.addEventListener("DOMContentLoaded", function(e) {
        // give success page a chance to set atb value
        setTimeout(() => {
            if (window === window.top) {
                let atb = getATB()
                if (atb) {
                    safari.self.tab.dispatchMessage('atb', {atb: atb})
                }
            }
        }, 500)
   }, true)
} else {
    chrome.runtime.sendMessage({atb: getATB()})
}
