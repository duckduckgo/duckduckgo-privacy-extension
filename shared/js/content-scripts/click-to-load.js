(function clickToLoad () {
    class DuckWidget {
        constructor (widgetData, originalElement) {
            this.imgURI = this.createImgURI(widgetData.imgFile)
            this.clickAction = {...widgetData.clickAction} // shallow copy
            this.originalElement = originalElement
            this.copySocialDataElements()
        }

        createImgURI (imgFile) {
            return chrome.runtime.getURL(imgFile)
        }

        copySocialDataElements () {
            if (!this.clickAction.urlDataAttributesToPreserve) {
                return
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
        frame.setAttribute('src', widgetData.clickAction.targetURL)
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

    window.addEventListener('message', (event) => {
        // Only accept messages from the same frame
        if (event.source !== window) {
            console.log('message, but not from frame')
            return
        }

        var message = event.data

        // Only accept messages that we know are ours
        if (typeof message !== 'object' || message === null || (!!message.source && message.source !== 'fb-surrogate')) {
            console.log(`message, but doesn't look like ours`)
            return
        }
        console.log(event)
    })
})()
