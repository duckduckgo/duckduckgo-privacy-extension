/**
 * The purpose of this content script is to hide third-party tracking ads that have been blocked
 * and appear as blank spaces on websites. In order to distinguish between tracking ads and legitimate
 * ads, it is necessary to inject this script into all frames.
 */

'use strict';

(function () {
    class ContentScript {
        constructor () {
            // Determine if content script is running in iframe or main frame
            this.frameType = window === window.top ? 'main' : window.parent === window.top ? 'topLevelFrame' : 'nestedFrame'
            this.containsBlockedRequest = false
            this.disabled = false
            this.frameListener = this.frameListener.bind(this)
            this.messageListener = this.messageListener.bind(this)
        }

        init () {
            // Listen for messages from background page
            chrome.runtime.onMessage.addListener(this.messageListener)
            // Listen for interframe messages
            window.addEventListener('message', this.frameListener)
        }

        /**
         * Set up messaging between frames and background page. When a request
         * is blocked in background page, a message is passed to the content script
         * in the frame that originated the request (or the parent frame, if the
         * blocked request has type sub_frame. If element hiding is not enabled
         * on current domain, background will send a 'disable' message to all
         * frames on the page, at which point event listeners are removed.
         */
        messageListener (req, sender, res) {
            if (req.type === 'blockedFrameAsset' && !this.containsBlockedRequest && this.frameType === 'topLevelFrame') {
                this.containsBlockedRequest = true
                this.mainFrameUrl = req.mainFrameUrl

                // If iframe doesn't have a src, we can access its frameElement
                // from within and hide immediately
                if (window.frameElement && window.frameElement.src === '') {
                    this.collapseDomNode(window.frameElement)
                } else {
                    window.top.postMessage({frameUrl: document.location.href, type: 'frameIdRequest'}, req.mainFrameUrl)
                }
            } else if (req.type === 'blockedFrame') {
                document.querySelectorAll('iframe').forEach((frame) => {
                    if (frame.src === req.request.url) {
                        this.collapseDomNode(frame)
                    }
                })
            } else if (req.type === 'disable') {
                this.disabled = true
                chrome.runtime.onMessage.removeListener(this.messageListener)
                window.removeEventListener('message', this.frameListener)
            }
        }

        /**
         * Set up listener in each frame to respond to messages from other frames.
         * There are three types of messages being passed:
         * 1. iframes send messages to the main frame requesting their id (frameIdRequest)
         * 2. main frame sends messages back to iframes with their id (setFrameId)
         * 3. iframes send messages to main frame when they contain blocked elements (hideFrame)
         */
        frameListener (e) {
            if (this.disabled || !e.data) return
            if (e.data.type === 'frameIdRequest') {
                document.querySelectorAll('iframe').forEach((frame) => {
                    if (frame.id && !frame.className.includes('ddg-hidden') && frame.src) {
                        frame.contentWindow.postMessage({frameId: frame.id, mainFrameUrl: document.location.href, type: 'setFrameId'}, '*')
                    }
                })
            } else if (e.data.type === 'setFrameId') {
                this.frameId = e.data.frameId
                this.mainFrameUrl = e.data.mainFrameUrl

                if (this.containsBlockedRequest) {
                    window.top.postMessage({frameId: this.frameId, type: 'hideFrame'}, this.mainFrameUrl)
                }
            } else if (e.data.type === 'hideFrame') {
                let frame = document.getElementById(e.data.frameId)
                this.collapseDomNode(frame)
            }
        }

        /**
         * Hide frames that were either themselves blocked, or that contain scripts
         * or other frames that were blocked. Then traverse DOM upward, hiding
         * parent selector if it only contains the blocked frame. Add class
         * and remove event listeners so that other content scripts no longer
         * interact with hidden frames
         */
        collapseDomNode (element) {
            if (!element) return
            element.style.setProperty('display', 'none', 'important')
            element.hidden = true
            element.classList.add('ddg-hidden')

            if (element.parentNode.childElementCount === 1 && !element.parentNode.textContent.trim()) {
                this.collapseDomNode(element.parentNode)
            }
        }
    }

    // Instantiate content script
    const contentScript = new ContentScript()
    contentScript.init()
})()
