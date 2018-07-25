/**
 * The purpose of this content script is to hide third-party tracking ads that have been blocked
 * and appear as blank spaces on websites. In order to distinguish between tracking ads and legitimate
 * ads, it is necessary to inject this script into all frames.
 */

'use strict';

(function () {
    class ContentScript {
        constructor() {
            // Determine if content script is running in iframe or main frame
            this.frameType = window === window.top ? 'main' : window.parent === window.top ? 'topLevelFrame' : 'nestedFrame'
            this.possibleTargets = []
            this.foundScripts = []
            this.foundFrames = []
            this.frameListener = this.frameListener.bind(this)
            // Initialize event listener for interframe messaging
            window.addEventListener('message', this.frameListener)

            /**
             * Set up messaging between frames and background page. When frames are
             * first loaded, they send a message to the background page requesting
             * a list of relevant requests that have been blocked. If element hiding
             * is not enabled on domain, background script will reply with 'disable',
             * at which point event listeners are removed. Otherwise gather relevant
             * DOM elements and then-
             * 1. if in main frame, proceed to locateBlockedFrames
             * 2. If in iframe, message main frame requesting id
             */
            chrome.runtime.onMessage.addListener((req, sender, res) => {
                if (req.type === 'blockedRequests') {
                    this.foundFrames = document.getElementsByTagName('iframe')
                    if (req.frame === 'main') {
                        this.locateBlockedFrames(req.blockedRequests)
                    } else if (req.frame === 'topLevelFrame') {
                        this.foundScripts = document.getElementsByTagName('script')
                        this.possibleTargets = Array.from(this.foundFrames).concat(Array.from(this.foundScripts))
                        window.top.postMessage({frameUrl: document.location.href, blockedRequests: req.blockedRequests, type: 'frameIdRequest'}, req.mainFrameUrl)
                    }
                } else if (req.type === 'disable') {
                    window.removeEventListener('message', this.frameListener)
                }
            })

            /**
             * When document hits 'interactive' readystate, all DOM elements have
             * been added to page and all requests for this document have been initiated.
             * At this point, kick off process by requesting list of blocked requests from
             * background page.
             */
            if (document.readyState === 'loading') {
                document.addEventListener('readystatechange', () => {
                    if (document.readyState === 'interactive') {
                        chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: this.frameType})
                    }
                })
            } else {
                chrome.runtime.sendMessage({hideElements: true, url: document.location.href, frame: this.frameType})
            }
        }

        /**
         * Set up listener in each frame to respond to messages from other frames.
         * There are three types of messages being passed:
         * 1. iframes send messages to the main frame requesting their id (frameIdRequest)
         * 2. main frame sends messages back to iframes with their id (setFrameId)
         * 3. iframes send messages to main frame when they contain blocked elements (hideFrame)
         */
        frameListener(e) {
            if (e.data.type === 'frameIdRequest') {
                this.foundFrames = document.getElementsByTagName('iframe')
                let i = this.foundFrames.length
                while (i--) {
                    let frame = this.foundFrames[i]
                    if (frame.src && frame.id && !e.data.blockedRequests.includes(frame.src) && !frame.className.includes('ddg-hidden')) {
                        frame.contentWindow.postMessage({frameId: frame.id, mainFrameUrl: document.location.href, blockedRequests: e.data.blockedRequests, type: 'setFrameId'}, '*')
                    }
                }
            } else if (e.data.type === 'hideFrame') {
                let frame = document.getElementById(e.data.frameId)
                this.hideFrame(frame)
            } else if (e.data.type === 'setFrameId') {
                this.frameId = e.data.frameId
                this.mainFrameUrl = e.data.mainFrameUrl
                this.locateBlockedFrames(e.data.blockedRequests)
            }
        }

        /**
         * Iterate through collection of potentially blocked elements, comparing against list
         * of blocked requests. In the main frame all we care about is iframes, but within iframes
         * we also look for blocked scripts that may have loaded a nested iframe
         */
        locateBlockedFrames(requests) {
            if (this.frameType === 'main') {
                let i = this.foundFrames.length
                while (i--) {
                    let frame = this.foundFrames[i]
                    if (requests.includes(frame.src)) {
                        this.hideFrame(frame)
                    }
                }
            } else if (this.frameType === 'topLevelFrame') {
                let i = this.possibleTargets.length
                while (i--) {
                    let elem = this.possibleTargets[i]
                    if (elem.src && requests.includes(elem.src)) {
                        window.top.postMessage({frameId: this.frameId, type: 'hideFrame'}, this.mainFrameUrl)
                        window.removeEventListener('message', this.frameListener)
                        break
                    }
                }
            }
        }

        /**
         * Hide frames that were either themselves blocked, or that contain scripts
         * or other frames that were blocked. Then traverse DOM upward, hiding
         * parent selector if it only contains the blocked frame. Add class
         * and remove event listeners so that other content scripts no longer
         * interact with hidden frames
         */
        hideFrame(frame) {
            frame.style.setProperty('display', 'none', 'important')
            frame.hidden = true
            frame.classList.add('ddg-hidden')

            if (frame.parentNode.childElementCount === 1) {
                this.hideFrame(frame.parentNode)
            }
        }
    }

    // Initialize content script if it doesn't already exist
    if (!contentScript) {
        var contentScript = new ContentScript();
    }
})()
