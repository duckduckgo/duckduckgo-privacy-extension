(function clickToLoad () {
    let appID

    class DuckWidget {
        constructor (widgetData, originalElement) {
            this.imgURI = this.createImgURI(widgetData.imgFile)
            this.clickAction = {...widgetData.clickAction} // shallow copy
            this.originalElement = originalElement
        }

        createImgURI (imgFile) {
            return chrome.runtime.getURL(imgFile)
        }

        getTargetURL () {
            // This has to be done lazy, since some required data may not be
            // captured until after page scripts run.
            this.copySocialDataFields()
            return this.clickAction.targetURL
        }

        copySocialDataFields () {
            if (!this.clickAction.urlDataAttributesToPreserve) {
                return
            }

            // App ID may be set by client scripts, and is required for some elements.
            if (this.clickAction.urlDataAttributesToPreserve.includes('app_id_replace') && appID != null) {
                this.clickAction.targetURL = this.clickAction.targetURL.replace('app_id_replace', appID)
            }

            for (const dataString of this.clickAction.urlDataAttributesToPreserve) {
                this.clickAction.targetURL = this.clickAction.targetURL.replace(dataString, this.originalElement.getAttribute(dataString))
            }
        }
    }

    function init (extensionResponseData) {
        replaceClickToLoadElements(extensionResponseData)
    }

    /**
     * Creates a safe element to replace the original tracking element.
     * @param {Object} widgetData - a single entry from elementData
     * @param {Element} originalElement - the element on the page we are replacing
     *
     * @returns {Element} a new element that can be inserted on the page in place of the original.
     */
    function createReplacementWidget (entity, widgetData, originalElement) {
        // Construct the widget based on data in the original element
        const widget = new DuckWidget(widgetData, originalElement)

        if (widgetData.replaceType === 'null') {
            let elem = document.createElement('div')
            return elem
        }
        if (widgetData.replaceType === 'button') {
            // Create a button to replace old element
            chrome.runtime.sendMessage({
                'getButtonImage': true
            }, function putButton (response) {
                const button = document.createElement('img')
                button.setAttribute('src', response)
                button.setAttribute('height', '75px')
                button.addEventListener('click', function handleClick (e) {
                    if (e.isTrusted) {
                        enableSocialTracker(entity)
                        if (widget.clickAction.type === 'allowFull') {
                            const parent = button.parentNode
                            parent.replaceChild(originalElement, button)
                            window.dispatchEvent(new CustomEvent('LoadFBSDK'))
                        }
                        if (widget.clickAction.type === 'iFrame') {
                            replaceDDGWidgetWithIFrame(button, widget)
                        }
                        if (widget.clickAction.type === 'originalElement') {
                            const parent = button.parentNode
                            parent.replaceChild(originalElement, button)
                        }
                    }
                })
                const parent = originalElement.parentNode
                parent.replaceChild(button, originalElement)
            })
        }
    }

    function replaceClickToLoadElements (config) {
        for (const entity of Object.keys(config)) {
            for (const widget of Object.values(config[entity].elementData)) {
                let els = document.querySelectorAll(widget.selectors.join())
                for (let el of els) {
                    createReplacementWidget(entity, widget, el)
                }
            }
        }
    }

    function replaceDDGWidgetWithIFrame (widgetElement, widgetData) {
        const frame = document.createElement('iframe')
        frame.setAttribute('src', widgetData.getTargetURL())
        frame.setAttribute('style', widgetData.clickAction.style)
        const parent = widgetElement.parentNode
        parent.replaceChild(frame, widgetElement)
    }

    function enableSocialTracker (entity) {
        chrome.runtime.sendMessage({
            'enableSocialTracker': entity,
            'alwaysAllow': false
        })
    }

    chrome.runtime.sendMessage({
        'initClickToLoad': true
    }, function (response) {
        if (!response) {
            return
        }
        if (document.readyState === 'complete') {
            init(response)
        } else {
            // Content script loaded before page content, so wait for load.
            window.addEventListener('load', (event) => {
                init(response)
            })
        }
    })

    function createModal (entity, message, eventName) {
        const elementCSS = `
            height: 100%;
            width: 100%;
            z-index: 2147483647;
            display: block;
            position: fixed;
        `
        const overlayCSS = `
            height: 100%;
            width: 100%;
            background-color: black;
            opacity: .5;
            display: block;
            position: fixed;
            top: 0;
            right: 0;
        `
        const modalCSS = `
            height: 20%;
            width: 50%;
            margin: 20% 25%;
            background-color: orange;
            position: relative;
            display: block;
        `
        let element = document.createElement('div')
        element.style.cssText = elementCSS
        element.id = 'duckduckgoctlmodal'
        let overlay = document.createElement('div')
        overlay.style.cssText = overlayCSS
        let modal = document.createElement('div')
        modal.style.cssText = modalCSS
        const allowButton = document.createElement('button')
        allowButton.innerHTML = 'Allow'
        const msg = document.createElement('p')
        allowButton.addEventListener('click', function handleClick (e) {
            if (e.isTrusted) {
                enableSocialTracker(entity)
                window.dispatchEvent(new CustomEvent(eventName))
                const modalParent = element.parentNode
                modalParent.removeChild(element)
            }
        })
        msg.innerHTML = message
        modal.appendChild(msg)
        modal.appendChild(allowButton)
        element.appendChild(overlay)
        element.appendChild(modal)
        return element
    }

    window.addEventListener('message', (event) => {
        // Only accept messages from the same frame
        if (event.source !== window) {
            return
        }

        var message = event.data

        // Only accept messages that we know are ours
        if (typeof message !== 'object' || message === null || (!!message.source && message.source !== 'fb-surrogate')) {
            return
        }

        // Save appID
        if (message.payload.appID) {
            appID = JSON.stringify(message.payload.appID).replace(/"/g, '')
        }

        // Handle login call
        if (message.payload.login || message.payload.fbui) {
            const body = document.body
            let e = createModal('Facebook', 'This site is trying to use login', 'RunFBLogin')
            body.insertBefore(e, body.childNodes[0])
            // body.appendChild(e)
        }
        
        if (message.payload.fbui) {
            const body = document.body
            let e = createModal('Facebook', 'This page is trying to use facebook social buttons, would you like to allow it?', 'LoadFBSDK')
            body.insertBefore(e, body.childNodes[0])
        }
    })
})()
