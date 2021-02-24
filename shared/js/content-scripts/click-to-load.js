(function clickToLoad () {
    let appID

    const styles = {
        button: `
            /* Grayscale/Gray90 - #333 */
            background: #333333;
            border-radius: 28px;

            padding: 11px 22px;
            color: #FFFFFF;
            margin: auto;
        `,
        circle: `
            border-radius: 50%;

            /* Grayscale/Gray30 - #e0e0e0 */
            background: #E0E0E0;
            opacity: 0.9;

            /* Grayscale/Gray90 - #333 */
            border: 3.26829px solid #333333;
            box-sizing: border-box;
            padding: 0px 3px 0px 9px;
        `,
        playIcon: `
            color: #333333;
            opacity: 0.9;
            border-radius: 2px;
            font-size: 3em;
            margin: 8px;
            font-family: Arial;
            font-weight: 400;
            line-height: normal;
        `,
        commentWrapper: `
            margin: 5px 15px;
            display: flex;
            flex-direction: row;
        `,
        commentLines: `
            display: grid;
            flex-direction: column;
            margin-left: 8px;
        `,
        commentPortrait: `
            width: 30px;
            height: 30px;
            left: 15px;
            top: 16px;

            background: #E5E5E5;
            border-radius: 3px;
        `,
        longComment: `
            width: 143px;
            height: 11px;
            left: 53px;
            top: 18px;

            background: linear-gradient(90deg, #E0E0E0 0%, #E0E0E0 100%);
            border-radius: 2px;
        `,
        shortComment: `
            width: 100px;
            height: 11px;
            left: 53px;
            top: 34px;

            background: #EEEEEE;
            border-radius: 2px;
        `,
        block: `

            /* General / White */
            background: #FFFFFF;

            /* Grayscale/Gray50 - #c3c3c3 */
            border: 1px solid #C3C3C3;
            box-sizing: border-box;
            border-radius: 10px;
            max-width: 500px;
            min-height: 300px;
            margin: auto;
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            grid-auto-rows: 1fr;
            flex-direction: column;
        `,
        content: `
            margin: auto;
        `,
        topBox: `

        `,
        msgContainer: `
            display: flex;
            height: 100%
            flex-direction: row;
            margin: auto;
        `,
        msg: ` 
            padding: 6.8059px 13.6118px;

            /* Grayscale/Gray15 - #f2f2f2 */
            background: #F2F2F2;
            border-radius: 13.6118px;
            width: 70%;
            margin: 11px 0px;
        `,
        msgImage: `
            height: 70px;
            margin: auto 0px;
        `
    }

    class DuckWidget {
        constructor (widgetData, originalElement, entity) {
            if (widgetData.replaceSettings.imgFile) {
                this.imgURI = this.createImgURI(widgetData.replaceSettings.imgFile)
            }
            this.clickAction = {...widgetData.clickAction} // shallow copy
            this.originalElement = originalElement
            this.dataElements = {}
            this.gatherDataElements()
            this.entity = entity
        }

        // Collect and store data elements from original widget. Store default values
        // from config if not present.
        gatherDataElements () {
            if (!this.clickAction.urlDataAttributesToPreserve) {
                return
            }
            for (const [attrName, attrSettings] of Object.entries(this.clickAction.urlDataAttributesToPreserve)) {
                let value = this.originalElement.getAttribute(attrName)
                if (!value) {
                    value = attrSettings.default
                }
                this.dataElements[attrName] = value
            }
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

        getStyle () {
            let styleString = this.clickAction.style
            if (styleString[styleString.length - 1] !== ';') {
                styleString += ';'
            }

            if (this.clickAction.styleDataAttributes) {
                // Copy elements from the original div into style attributes as directed by config
                for (const [attr, valAttr] of Object.entries(this.clickAction.styleDataAttributes)) {
                    let valueFound = this.dataElements[valAttr.name]
                    if (!valueFound) {
                        valueFound = this.originalElement.getAttribute(valAttr.fallbackAttribute)
                    }
                    if (valueFound) {
                        styleString += `${attr}: ${valueFound}${valAttr.unit};`
                    }
                }
            }

            return styleString
        }

        copySocialDataFields () {
            if (!this.clickAction.urlDataAttributesToPreserve) {
                return
            }

            // App ID may be set by client scripts, and is required for some elements.
            if (this.dataElements['app_id_replace'] && appID != null) {
                this.clickAction.targetURL = this.clickAction.targetURL.replace('app_id_replace', appID)
            }

            for (const key of Object.keys(this.dataElements)) {
                const attrValue = encodeURIComponent(this.dataElements[key])
                if (attrValue) {
                    this.clickAction.targetURL = this.clickAction.targetURL.replace(key, attrValue)
                }
            }
        }

        clickFunction (originalElement, replacementElement) {
            return function handleClick (e) {
                if (e.isTrusted) {
                    enableSocialTracker(this.entity)
                    if (this.clickAction.type === 'allowFull') {
                        const parent = replacementElement.parentNode
                        parent.replaceChild(originalElement, replacementElement)
                        window.dispatchEvent(new CustomEvent('LoadFBSDK'))
                    }
                    if (this.clickAction.type === 'iFrame') {
                        replaceDDGWidgetWithIFrame(replacementElement, this)
                    }
                    if (this.clickAction.type === 'originalElement') {
                        const parent = replacementElement.parentNode
                        parent.replaceChild(originalElement, replacementElement)
                    }
                }
            }.bind(this)
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
        const widget = new DuckWidget(widgetData, originalElement, entity)
        const parent = originalElement.parentNode

        if (widgetData.replaceSettings.type === 'blank') {
            const el = document.createElement('div')
            parent.replaceChild(el, originalElement)
        }
        let button
        if (widgetData.replaceSettings.type === 'button') {
            // Create a button to replace old element
            button = makeButton(widgetData.replaceSettings.buttonText)
            button.addEventListener('click', widget.clickFunction(originalElement, button))
            parent.replaceChild(button, originalElement)
        }
        if (widgetData.replaceSettings.type === 'videoElement') {
            chrome.runtime.sendMessage({
                'getButtonImage': true
            }, function putButton (response) {
                button = makeVideoButton(widgetData.replaceSettings.buttonText)
                const el = createContentBlock(
                    widgetData.replaceSettings.infoText,
                    button,
                    response)
                button.addEventListener('click', widget.clickFunction(originalElement, el))
                parent.replaceChild(el, originalElement)
            })
        }
        if (widgetData.replaceSettings.type === 'pageElement') {
            // Create a button to replace old element
            chrome.runtime.sendMessage({
                'getButtonImage': true
            }, function putButton (response) {
                button = makeButton(widgetData.replaceSettings.buttonText)
                const el = createContentBlock(
                    widgetData.replaceSettings.infoText,
                    button,
                    response)
                button.addEventListener('click', widget.clickFunction(originalElement, el))

                /*
                button.addEventListener('click', function handleClick (e) {
                    if (e.isTrusted) {
                        enableSocialTracker(entity)
                        if (widget.clickAction.type === 'allowFull') {
                            const parent = el.parentNode
                            parent.replaceChild(originalElement, el)
                            window.dispatchEvent(new CustomEvent('LoadFBSDK'))
                        }
                        if (widget.clickAction.type === 'iFrame') {
                            replaceDDGWidgetWithIFrame(el, widget)
                        }
                        if (widget.clickAction.type === 'originalElement') {
                            const parent = el.parentNode
                            parent.replaceChild(originalElement, el)
                        }
                    }
                })
                /*
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
                */
                parent.replaceChild(el, originalElement)
            })
        }
    }

    function createClickAction (widget, entity, originalElement, replacementElement) {
        const handleClick = function handleClick (e) {
            if (e.isTrusted) {
                enableSocialTracker(entity)
                if (widget.clickAction.type === 'allowFull') {
                    const parent = replacementElement.parentNode
                    parent.replaceChild(originalElement, replacementElement)
                    window.dispatchEvent(new CustomEvent('LoadFBSDK'))
                }
                if (widget.clickAction.type === 'iFrame') {
                    replaceDDGWidgetWithIFrame(replacementElement, widget)
                }
                if (widget.clickAction.type === 'originalElement') {
                    const parent = replacementElement.parentNode
                    parent.replaceChild(originalElement, replacementElement)
                }
            }
        }
        return handleClick
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
        frame.setAttribute('style', widgetData.getStyle())
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

    function makeButton (buttonText) {
        const button = document.createElement('button')
        button.style.cssText = styles.button
        button.innerHTML = buttonText
        return button
    }

    function makeVideoButton () {
        const circleButton = document.createElement('button')
        circleButton.style.cssText = styles.circle
        const play = document.createElement('div')
        play.style.cssText = styles.playIcon
        play.innerHTML = '&#9654;' // right triangle html symbol.
        circleButton.appendChild(play)
        return circleButton
    }

    function createCommentGhost () {
        const commentWrapper = document.createElement('div')
        commentWrapper.style.cssText = styles.commentWrapper
        const commentBox = document.createElement('div')
        commentBox.style.cssText = styles.commentPortrait
        commentWrapper.appendChild(commentBox)
        const commentLines = document.createElement('div')
        commentLines.style.cssText = styles.commentLines
        commentWrapper.appendChild(commentLines)
        const commentBoxLong = document.createElement('div')
        commentBoxLong.style.cssText = styles.longComment
        commentLines.appendChild(commentBoxLong)
        const commentBoxShort = document.createElement('div')
        commentBoxShort.style.cssText = styles.shortComment
        commentLines.appendChild(commentBoxShort)
        return commentWrapper
    }

    function createContentBlock (message, button, img) {
        const element = document.createElement('div')
        element.style.cssText = styles.block
        const topBox = document.createElement('div')
        topBox.style.cssText = styles.topBox
        element.appendChild(topBox)
        topBox.appendChild(createCommentGhost())
        topBox.appendChild(createCommentGhost())
        const content = document.createElement('div')
        content.style.cssText = styles.content
        element.appendChild(content)
        content.appendChild(button)
        const msgContainer = document.createElement('div')
        msgContainer.style.cssText = styles.msgContainer
        element.appendChild(msgContainer)
        if (img) {
            const imgElement = document.createElement('img')
            imgElement.style.cssText = styles.msgImage
            imgElement.setAttribute('src', img)
            imgElement.setAttribute('height', '70px')
            msgContainer.appendChild(imgElement)
        }
        const msg = document.createElement('div')
        msg.style.cssText = styles.msg
        msg.innerHTML = `<span>${message}</span>`
        msgContainer.appendChild(msg)
        return element
    }

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
        const element = document.createElement('div')
        element.style.cssText = elementCSS
        element.id = 'duckduckgoctlmodal'
        const overlay = document.createElement('div')
        overlay.style.cssText = overlayCSS
        const modal = document.createElement('div')
        modal.style.cssText = modalCSS
        const allowButton = document.createElement('button')
        allowButton.innerHTML = 'Allow'
        const denyButton = document.createElement('button')
        denyButton.innerHTML = 'Deny'
        const msg = document.createElement('p')
        allowButton.addEventListener('click', function handleClick (e) {
            if (e.isTrusted) {
                enableSocialTracker(entity)
                window.dispatchEvent(new CustomEvent(eventName))
                const modalParent = element.parentNode
                modalParent.removeChild(element)
            }
        })
        denyButton.addEventListener('click', function handleClick (e) {
            if (e.isTrusted) {
                const modalParent = element.parentNode
                modalParent.removeChild(element)
            }
        })
        msg.innerHTML = message
        modal.appendChild(msg)
        modal.appendChild(denyButton)
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
        }

        if (message.payload.fbui) {
            const body = document.body
            let e = createModal('Facebook', 'This page is trying to use facebook social buttons, would you like to allow it?', 'LoadFBSDK')
            body.insertBefore(e, body.childNodes[0])
        }
    })
})()
