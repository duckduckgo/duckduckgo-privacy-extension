(function clickToLoad () {
    let appID
    const loadingImages = {
        darkMode: '',
        lightMode: ''
    }
    let logoImg
    const titleID = 'DuckDuckGoPrivacyEssentialsCTLElementTitle'
    const entities = []
    const ddgFont = chrome.runtime.getURL('public/font/ProximaNova-Reg-webfont.woff')
    const ddgFontBold = chrome.runtime.getURL('public/font/ProximaNova-Bold-webfont.woff2')
    const entityData = {}

    /*********************************************************
     *  Style Definitions
     *********************************************************/
    const styles = {
        fontStyle: `
            @font-face{
                font-family: DuckDuckGoPrivacyEssentials;
                src: url(${ddgFont});
            }
            @font-face{
                font-family: DuckDuckGoPrivacyEssentialsBold;
                font-weight: bold;
                src: url(${ddgFontBold});
            }
        `,
        darkMode: {
            background: `
                background: #111111;
            `,
            textFont: `
                color: rgba(255, 255, 255, 0.9);
            `,
            buttonFont: `
                color: #111111;
            `,
            linkFont: `
                color: #5784FF;
            `,
            buttonBackground: `
                background: #5784FF;
            `
        },
        lightMode: {
            background: `
                background: #FFFFFF;
            `,
            textFont: `
                color: #222222;
            `,
            buttonFont: `
                color: #FFFFFF;
            `,
            linkFont: `
                color: #3969EF;
            `,
            buttonBackground: `
                background: #3969EF;
            `
        },
        loginMode: {
            buttonBackground: `
                background: #666666;
            `,
            buttonFont: `
                color: #FFFFFF;
            `
        },
        cancelMode: {
            buttonBackground: `
                background: rgba(34, 34, 34, 0.1);
            `,
            buttonFont: `
                color: #222222;
            `
        },
        button: `
            border-radius: 8px;

            padding: 11px 22px;
            font-weight: bold;
            margin: auto;
            border-color: #3969EF;
            border: none;

            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 14px;

            position: relative;
            cursor: pointer;
            box-shadow: none;
            z-index: 2147483646;
        `,
        circle: `
            border-radius: 50%;
            width: 18px;
            height: 18px;
            background: #E0E0E0;
            border: 1px solid #E0E0E0;
            position: absolute;
            top: -8px;
            right: -8px;
        `,
        loginIcon: `
            position: absolute;
            top: -13px;
            right: -10px;
            height: 28px;
            width: 28px;
        `,
        rectangle: `
            width: 12px;
            height: 3px;
            background: #666666;
            position: relative;
            top: 42.5%;
            margin: auto;
        `,
        textBubble: `
            background: #FFFFFF;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 16px;
            box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.12), 0px 8px 16px rgba(0, 0, 0, 0.08);
            width: 360px;
            margin-top: 10px;
            z-index: 2147483647;
            position: absolute;
        `,
        textBubbleWidth: 360, // Should match the width rule in textBubble
        textBubbleLeftShift: 100, // Should match the CSS left: rule in textBubble
        textArrow: `
            display: inline-block;
            background: #FFFFFF;
            border: solid rgba(0, 0, 0, 0.1);
            border-width: 0 1px 1px 0;
            padding: 5px;
            transform: rotate(-135deg);
            -webkit-transform: rotate(-135deg);
            position: relative;
            top: -9px;
        `,
        arrowDefaultLocationPercent: 50,
        hoverTextTitle: `
            padding: 0px 12px 12px;
            margin-top: -5px;
        `,
        hoverTextBody: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 14px;
            line-height: 21px;
            margin: auto;
            padding: 17px;
            text-align: left;
        `,
        hoverContainer: `
            padding-bottom: 10px;
        `,
        buttonTextContainer: `
            display: flex; 
            flex-direction: row;
            align-items: center;
        `,
        headerRow: `

        `,
        block: `
            box-sizing: border-box;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 12px;
            max-width: 600px;
            min-height: 300px;
            margin: auto;
            display: flex;
            flex-direction: column;
            
            font-family: DuckDuckGoPrivacyEssentials;
            line-height: 1;
        `,
        imgRow: `
            display: flex;
            flex-direction: column;
            margin: 20px 0px;
        `,
        content: `
            display: flex;
            flex-direction: column;
            margin: auto;
        `,
        titleBox: `
            display: flex;
            padding: 12px;
            max-height: 44px;
            border-bottom: 1px solid;
            border-color: rgba(196, 196, 196, 0.3);
        `,
        title: `
            font-family: DuckDuckGoPrivacyEssentials;
            line-height: 1.4;
            font-size: 14px;
            margin: auto 10px;
            flex-basis: 100%;
            height: 1.4em;
            flex-wrap: wrap;
            overflow: hidden;
            text-align: left;
        `,
        buttonRow: `
            display: flex;
            height: 100%
            flex-direction: row;
            margin: 20px auto 0px;
            padding-bottom: 36px;
        `,
        modalContentTitle: `
            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 17px;
            font-weight: bold;
            line-height: 21px;
            margin: 27px auto 10px;
            text-align: center;
        `,
        modalContentText: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 14px;
            line-height: 21px;
            margin: 0px auto 24px;
            text-align: center;
        `,
        modalButton: `
        `,
        modalIcon: `
            display: block;
        `,
        contentTitle: `
            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 17px;
            font-weight: bold;
            margin: 20px auto 10px;
            padding: 0px 30px;
            text-align: center;
        `,
        contentText: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 14px;
            line-height: 21px;
            margin: auto;
            padding: 0px 40px;
            text-align: center;
        `,
        icon: `
            height: 80px;
            width: 80px;
            margin: auto;
        `,
        logo: `
            flex-basis: 0%;
            min-width: 20px;
            height: 21px;
        `,
        logoImg: `
            height: 21px;
            width: 21px;
        `,
        loadingImg: `
            display: block;
            margin: 0px 8px 0px 0px;
            height: 14px;
            width: 14px;
        `,
        modal: `
            width: 312px;
            margin: auto;
            background-color: #FFFFFF;
            position: absolute;
            left: calc(50% - 312px/2);
            top: calc(50% - 356px/2 + 0.5px);
            display: block;
            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
        `,
        modalContent: `
            padding: 24px;
            display: flex;
            flex-direction: column;
        `,
        overlay: `
            height: 100%;
            width: 100%;
            background-color: #666666;
            opacity: .5;
            display: block;
            position: fixed;
            top: 0;
            right: 0;
        `,
        modalContainer: `
            height: 100%;
            width: 100%;
            z-index: 2147483647;
            display: block;
            position: fixed;
        `,
        headerLinkContainer: `
            flex-basis: 100%;
            display: grid;
            justify-content: flex-end;
        `,
        headerLink: `
            line-height: 1.4;
            font-size: 14px;
            font-weight: bold;
            font-family: DuckDuckGoPrivacyEssentialsBold;
            text-decoration: none;
            cursor: pointer;
            min-width: 100px;
            text-align: end;
            float: right;
            display: none;
        `,
        generalLink: `
            line-height: 1.4;
            font-size: 14px;
            font-weight: bold;
            font-family: DuckDuckGoPrivacyEssentialsBold;
            cursor: pointer;
            text-decoration: none;
        `,
        fbContainer: `
            display: inline-block;
        `
    }

    /*********************************************************
     *  Widget Replacement logic
     *********************************************************/
    class DuckWidget {
        constructor (widgetData, originalElement, entity) {
            this.clickAction = { ...widgetData.clickAction } // shallow copy
            this.replaceSettings = widgetData.replaceSettings
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
                    if (attrSettings.required) {
                        // missing a required attribute means we won't be able to replace it
                        // with a light version, replace with full version.
                        this.clickAction.type = 'allowFull'
                    }
                    value = attrSettings.default
                }
                this.dataElements[attrName] = value
            }
        }

        // Return the facebook content URL to use when a user has clicked.
        getTargetURL () {
            // Copying over data fields should be done lazily, since some required data may not be
            // captured until after page scripts run.
            this.copySocialDataFields()
            return this.clickAction.targetURL
        }

        // Determine if element should render in dark mode
        getMode () {
            // Login buttons are always the login style types
            if (this.replaceSettings.type === 'loginButton') {
                return 'loginMode'
            }
            const mode = this.originalElement.getAttribute('data-colorscheme')
            if (mode === 'dark') {
                return 'darkMode'
            }
            return 'lightMode'
        }

        // The config file offers the ability to style the replaced facebook widget. This
        // collects the style from the original element & any specified in config for the element
        // type and returns a CSS string.
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
                        valueFound = this.dataElements[valAttr.fallbackAttribute]
                    }
                    let partialStyleString = ''
                    if (valueFound) {
                        partialStyleString += `${attr}: ${valueFound}`
                    }
                    if (!partialStyleString.includes(valAttr.unit)) {
                        partialStyleString += valAttr.unit
                    }
                    partialStyleString += ';'
                    styleString += partialStyleString
                }
            }

            return styleString
        }

        // Some data fields are 'kept' from the original element. These are used both in
        // replacement styling (darkmode, width, height), and when returning to a FB element.
        copySocialDataFields () {
            if (!this.clickAction.urlDataAttributesToPreserve) {
                return
            }

            // App ID may be set by client scripts, and is required for some elements.
            if (this.dataElements.app_id_replace && appID != null) {
                this.clickAction.targetURL = this.clickAction.targetURL.replace('app_id_replace', appID)
            }

            for (const key of Object.keys(this.dataElements)) {
                const attrValue = encodeURIComponent(this.dataElements[key])
                if (attrValue) {
                    this.clickAction.targetURL = this.clickAction.targetURL.replace(key, attrValue)
                }
            }
        }

        /*
         * Creates an iFrame for this facebook content.
         */
        createFBIFrame () {
            const frame = document.createElement('iframe')

            frame.setAttribute('src', this.getTargetURL())
            frame.setAttribute('style', this.getStyle())

            return frame
        }

        /*
         * Fades out the given element. Returns a promise that resolves when the fade is complete.
         * @param {Element} element - the element to fade in or out
         * @param {int} interval - frequency of opacity updates (ms)
         * @param {bool} fadeIn - true if the element should fade in instead of out
         */
        fadeElement (element, interval, fadeIn) {
            return new Promise((resolve, reject) => {
                let opacity = fadeIn ? 0 : 1
                const originStyle = element.style.cssText
                const fadeOut = setInterval(function () {
                    opacity += fadeIn ? 0.03 : -0.03
                    element.style.cssText = originStyle + `opacity: ${opacity};`
                    if (opacity <= 0 || opacity >= 1) {
                        clearInterval(fadeOut)
                        resolve()
                    }
                }, interval)
            })
        }

        fadeOutElement (element) {
            return this.fadeElement(element, 10, false)
        }

        fadeInElement (element) {
            return this.fadeElement(element, 10, true)
        }

        clickFunction (originalElement, replacementElement, shouldFade = true) {
            let clicked = false
            const handleClick = function handleClick (e) {
                // Ensure that the click is created by a user event & prevent double clicks from adding more animations
                if (e.isTrusted && !clicked) {
                    clicked = true
                    let isLogin = false
                    if (this.replaceSettings.type === 'loginButton') {
                        isLogin = true
                    }
                    enableSocialTracker(this.entity, false, isLogin)
                    const parent = replacementElement.parentNode

                    // If we allow everything when this element is clicked,
                    // notify surrogate to enable SDK and replace original element.
                    if (this.clickAction.type === 'allowFull') {
                        window.dispatchEvent(new CustomEvent(`Load${this.entity}SDK`))
                        parent.replaceChild(originalElement, replacementElement)
                        return
                    }
                    // Create a container for the new FB element
                    const fbContainer = document.createElement('div')
                    fbContainer.style.cssText = styles.fbContainer
                    const fadeIn = document.createElement('div')
                    fadeIn.style.cssText = 'display: none; opacity: 0;'

                    // Loading animation (FB can take some time to load)
                    const loadingImg = document.createElement('img')
                    loadingImg.setAttribute('src', loadingImages[this.getMode()])
                    loadingImg.setAttribute('height', '14px')
                    loadingImg.style.cssText = styles.loadingImg

                    // Always add the animation to the button, regardless of click source
                    if (e.srcElement.nodeName === 'BUTTON') {
                        e.srcElement.firstElementChild.insertBefore(loadingImg, e.srcElement.firstElementChild.firstChild)
                    } else {
                        // try to find the button
                        let el = e.srcElement
                        let button = null
                        while (button === null && el !== null) {
                            button = el.querySelector('button')
                            el = el.parentElement
                        }
                        if (button) {
                            button.firstElementChild.insertBefore(loadingImg, button.firstElementChild.firstChild)
                        }
                    }

                    fbContainer.appendChild(fadeIn)
                    // default case is this.clickAction.type === 'originalElement'
                    let fbElement = originalElement

                    if (this.clickAction.type === 'iFrame') {
                        fbElement = this.createFBIFrame()
                    }

                    /*
                     * Modify the overlay to include a Facebook iFrame, which
                     * starts invisible. Once loaded, fade out and remove the overlay
                     * then fade in the Facebook content
                     */
                    parent.replaceChild(fbContainer, replacementElement)
                    fbContainer.appendChild(replacementElement)
                    fadeIn.appendChild(fbElement)
                    fbElement.addEventListener('load', () => {
                        this.fadeOutElement(replacementElement)
                            .then(v => {
                                fbContainer.removeChild(replacementElement)
                                fadeIn.style.cssText = 'opacity: 0;'
                                this.fadeInElement(fadeIn).then(v => {
                                    fbElement.focus() // focus on new element for screen readers
                                })
                            })
                    })
                }
            }.bind(this)
            // If this is a login button, show modal if needed
            if (this.replaceSettings.type === 'loginButton' && entityData[this.entity].shouldShowLoginModal) {
                return function handleLoginClick (e) {
                    makeModal(this.entity, handleClick, e)
                }.bind(this)
            }
            return handleClick
        }
    }

    function init (extensionResponseData) {
        for (const entity of Object.keys(extensionResponseData)) {
            entities.push(entity)
            entityData[entity] = {
                shouldShowLoginModal: true,
                modalIcon: extensionResponseData[entity].informationalModal.icon,
                modalTitle: extensionResponseData[entity].informationalModal.messageTitle,
                modalText: extensionResponseData[entity].informationalModal.messageBody,
                modalAcceptText: extensionResponseData[entity].informationalModal.confirmButtonText,
                modalRejectText: extensionResponseData[entity].informationalModal.rejectButtonText,
                simpleVersion: extensionResponseData[entity].simpleVersion
            }
        }
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
        if (widgetData.replaceSettings.type === 'loginButton') {
            chrome.runtime.sendMessage({
                getImage: widgetData.replaceSettings.icon
            }, function putLoginButton (icon) {
                // Create a button to replace old element
                const { button, container } = makeLoginButton(widgetData.replaceSettings.buttonText, widget.getMode(), widgetData.replaceSettings.popupTitleText, widgetData.replaceSettings.popupBodyText, icon, originalElement)
                button.addEventListener('click', widget.clickFunction(originalElement, container))
                parent.replaceChild(container, originalElement)
            })
        }
        if (widgetData.replaceSettings.type === 'dialog') {
            chrome.runtime.sendMessage({
                getImage: widgetData.replaceSettings.icon
            }, function putButton (icon) {
                const button = makeButton(widgetData.replaceSettings.buttonText, widget.getMode())
                const textButton = makeTextButton(widgetData.replaceSettings.buttonText, widget.getMode())
                const el = createContentBlock(
                    widget,
                    button,
                    textButton,
                    icon)
                button.addEventListener('click', widget.clickFunction(originalElement, el))
                textButton.addEventListener('click', widget.clickFunction(originalElement, el))
                parent.replaceChild(el, originalElement)
                // Show an unblock link if parent element forces small height
                // which may hide video.
                if ((!!el.offsetHeight && el.offsetHeight <= 200) || (!!el.parentNode && el.parentNode.offsetHeight <= 200)) {
                    const textButton = el.querySelector(`#${titleID + 'TextButton'}`)
                    textButton.style.cssText += 'display: block'
                }
            })
        }
    }

    function replaceClickToLoadElements (config) {
        for (const entity of Object.keys(config)) {
            for (const widget of Object.values(config[entity].elementData)) {
                const els = document.querySelectorAll(widget.selectors.join())
                for (const el of els) {
                    createReplacementWidget(entity, widget, el)
                }
            }
        }
    }

    /*********************************************************
     *  Messaging to surrogates & extension
     *********************************************************/
    function enableSocialTracker (entity, alwaysAllow, isLogin) {
        const message = {
            enableSocialTracker: entity,
            alwaysAllow: alwaysAllow,
            isLogin: isLogin
        }
        chrome.runtime.sendMessage(message)
    }

    chrome.runtime.sendMessage({
        initClickToLoad: true
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

    // Fetch reusable assets
    chrome.runtime.sendMessage({
        getLoadingImage: 'light'
    }, function (response) {
        loadingImages.lightMode = response
    })

    chrome.runtime.sendMessage({
        getLoadingImage: 'dark'
    }, function (response) {
        loadingImages.darkMode = response
    })

    chrome.runtime.sendMessage({
        getLogo: true
    }, function (response) {
        logoImg = response
    })

    // Listen for events from surrogates
    addEventListener('ddgClickToLoad', (event) => {
        if (!event.detail) return
        const entity = event.detail.entity
        if (!entities.includes(entity)) {
            // Unknown entity, reject
            return
        }
        if (event.detail.appID) {
            appID = JSON.stringify(event.detail.appID).replace(/"/g, '')
        }
        // Handle login call
        if (event.detail.action === 'login') {
            if (entityData[entity].shouldShowLoginModal) {
                makeModal(entity, runLogin, entity)
            } else {
                runLogin(entity)
            }
        }
    })

    function runLogin (entity) {
        enableSocialTracker(entity, false, true)
        window.dispatchEvent(new CustomEvent(`Run${entity}Login`))
    }

    /*********************************************************
     *  Widget building blocks
     *********************************************************/
    function getLearnMoreLink (mode) {
        if (!mode) {
            mode = 'lightMode'
        }
        const linkElement = document.createElement('a')
        linkElement.style.cssText = styles.generalLink + styles[mode].linkFont
        linkElement.ariaLabel = 'Read about this privacy protection'
        linkElement.href = 'https://help.duckduckgo.com/duckduckgo-help-pages/privacy/embedded-content-protection/'
        linkElement.textContent = 'Learn More'
        return linkElement
    }

    function makeTextButton (linkText, mode) {
        const linkElement = document.createElement('a')
        linkElement.style.cssText = styles.headerLink + styles[mode].linkFont
        linkElement.textContent = linkText
        return linkElement
    }

    function makeButton (buttonText, mode) {
        const button = document.createElement('button')
        button.style.cssText = styles.button + styles[mode].buttonBackground
        const textContainer = document.createElement('div')
        textContainer.style.cssText = styles.buttonTextContainer + styles[mode].buttonFont
        textContainer.textContent = buttonText
        button.appendChild(textContainer)
        return button
    }

    /* If there isn't an image available, just make a default block symbol */
    function makeDefaultBlockIcon () {
        const blockedIcon = document.createElement('div')
        const dash = document.createElement('div')
        blockedIcon.appendChild(dash)
        blockedIcon.style.cssText = styles.circle
        dash.style.cssText = styles.rectangle
        return blockedIcon
    }

    /* FB login replacement button, with hover text */
    function makeLoginButton (buttonText, mode, hoverTextTitle, hoverTextBody, icon, originalElement) {
        const container = document.createElement('div')
        container.style.cssText = 'position: relative;'
        // inherit any class styles on the button
        container.className = 'fb-login-button FacebookLogin__button'
        const styleElement = document.createElement('style')
        styleElement.textContent = `
            #DuckDuckGoPrivacyEssentialsHoverableText {
                display: none;
            }
            #DuckDuckGoPrivacyEssentialsHoverable:hover #DuckDuckGoPrivacyEssentialsHoverableText {
                display: block;
            }
        `
        container.appendChild(styleElement)

        const hoverContainer = document.createElement('div')
        hoverContainer.id = 'DuckDuckGoPrivacyEssentialsHoverable'
        hoverContainer.style.cssText = styles.hoverContainer
        container.appendChild(hoverContainer)

        // Make the button
        const button = makeButton(buttonText, mode)
        // Add blocked icon
        if (!icon) {
            button.appendChild(makeDefaultBlockIcon())
        } else {
            const imgElement = document.createElement('img')
            imgElement.style.cssText = styles.loginIcon
            imgElement.setAttribute('src', icon)
            imgElement.setAttribute('height', '28px')
            button.appendChild(imgElement)
        }
        hoverContainer.appendChild(button)

        // hover action
        const hoverBox = document.createElement('div')
        hoverBox.id = 'DuckDuckGoPrivacyEssentialsHoverableText'
        hoverBox.style.cssText = styles.textBubble
        const arrow = document.createElement('div')
        arrow.style.cssText = styles.textArrow
        hoverBox.appendChild(arrow)
        const branding = createTitleRow('DuckDuckGo')
        branding.style.cssText += styles.hoverTextTitle
        hoverBox.appendChild(branding)
        const hoverText = document.createElement('div')
        hoverText.style.cssText = styles.hoverTextBody
        hoverText.textContent = hoverTextBody + ' '
        hoverText.appendChild(getLearnMoreLink())
        hoverBox.appendChild(hoverText)

        hoverContainer.appendChild(hoverBox)
        const rect = originalElement.getBoundingClientRect()
        /*
        * The left side of the hover popup may go offscreen if the
        * login button is all the way on the left side of the page. This
        * If that is the case, dynamically shift the box right so it shows
        * properly.
        */
        if (rect.left < styles.textBubbleLeftShift) {
            const leftShift = -rect.left + 10 // 10px away from edge of the screen
            hoverBox.style.cssText += `left: ${leftShift}px;`
            const change = (1 - (rect.left / styles.textBubbleLeftShift)) * (100 - styles.arrowDefaultLocationPercent)
            arrow.style.cssText += `left: ${Math.max(10, styles.arrowDefaultLocationPercent - change)}%;`
        } else if (rect.left + styles.textBubbleWidth - styles.textBubbleLeftShift > window.innerWidth) {
            const rightShift = rect.left + styles.textBubbleWidth - styles.textBubbleLeftShift
            const diff = Math.min(rightShift - window.innerWidth, styles.textBubbleLeftShift)
            const rightMargin = 20 // Add some margin to the page, so scrollbar doesn't overlap.
            hoverBox.style.cssText += `left: -${styles.textBubbleLeftShift + diff + rightMargin}px;`
            const change = ((diff / styles.textBubbleLeftShift)) * (100 - styles.arrowDefaultLocationPercent)
            arrow.style.cssText += `left: ${Math.max(10, styles.arrowDefaultLocationPercent + change)}%;`
        } else {
            hoverBox.style.cssText += `left: -${styles.textBubbleLeftShift}px;`
            arrow.style.cssText += `left: ${styles.arrowDefaultLocationPercent}%;`
        }

        return {
            button: button,
            container: container
        }
    }

    function makeModal (entity, acceptFunction, ...acceptFunctionParams) {
        chrome.runtime.sendMessage({
            getImage: entityData[entity].modalIcon
        }, function putModal (icon) {
            const modalContainer = document.createElement('div')
            modalContainer.style.cssText = styles.modalContainer
            const pageOverlay = document.createElement('div')
            pageOverlay.style.cssText = styles.overlay
            const modal = document.createElement('div')
            modal.style.cssText = styles.modal

            // Title
            const modalTitle = createTitleRow('DuckDuckGo')
            modal.appendChild(modalTitle)

            // Content
            const modalContent = document.createElement('div')
            modalContent.style.cssText = styles.modalContent

            const iconElement = document.createElement('img')
            iconElement.style.cssText = styles.icon + styles.modalIcon
            iconElement.setAttribute('src', icon)
            iconElement.setAttribute('height', '70px')

            const title = document.createElement('div')
            title.style.cssText = styles.modalContentTitle
            title.textContent = entityData[entity].modalTitle

            const message = document.createElement('div')
            message.style.cssText = styles.modalContentText
            message.textContent = entityData[entity].modalText + ' '
            message.appendChild(getLearnMoreLink())

            modalContent.appendChild(iconElement)
            modalContent.appendChild(title)
            modalContent.appendChild(message)

            // Buttons
            const buttonRow = document.createElement('div')
            buttonRow.style.cssText = 'margin:auto;'
            const allowButton = makeButton(entityData[entity].modalAcceptText, 'lightMode')
            allowButton.style.cssText += styles.modalButton + 'margin-right: 15px;'
            allowButton.addEventListener('click', function doLogin () {
                acceptFunction(...acceptFunctionParams)
                document.body.removeChild(modalContainer)
            })
            const rejectButton = makeButton(entityData[entity].modalRejectText, 'cancelMode')
            rejectButton.style.cssText += styles.modalButton + 'float: right;'
            rejectButton.addEventListener('click', function cancelLogin () {
                document.body.removeChild(modalContainer)
            })

            buttonRow.appendChild(allowButton)
            buttonRow.appendChild(rejectButton)
            modalContent.appendChild(buttonRow)

            modal.appendChild(modalContent)

            modalContainer.appendChild(pageOverlay)
            modalContainer.appendChild(modal)
            document.body.insertBefore(modalContainer, document.body.childNodes[0])
        })
    }

    function createTitleRow (message, textButton) {
        // Create row container
        const row = document.createElement('div')
        row.style.cssText = styles.titleBox

        // Logo
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = styles.logo
        const logoElement = document.createElement('img')
        logoElement.setAttribute('src', logoImg)
        logoElement.setAttribute('height', '21px')
        logoElement.style.cssText = styles.logoImg
        logoContainer.appendChild(logoElement)
        row.appendChild(logoContainer)

        // Content box title
        const msgElement = document.createElement('div')
        msgElement.id = titleID // Ensure we can find this to potentially hide it later.
        msgElement.textContent = message
        msgElement.style.cssText = styles.title
        row.appendChild(msgElement)

        // Text button for very small boxes
        if (textButton) {
            textButton.id = titleID + 'TextButton'
            row.appendChild(textButton)
        }

        return row
    }

    // Create the content block to replace other divs/iframes with
    function createContentBlock (widget, button, textButton, img) {
        const wrapper = document.createElement('div')
        wrapper.style.cssText = 'display: inline-block;'
        // Style element includes our font & overwrites page styles
        const styleElement = document.createElement('style')
        const wrapperClass = 'DuckDuckGoSocialContainer'
        styleElement.textContent = styles.fontStyle + `
            .${wrapperClass} a {
                ${styles[widget.getMode()].linkFont}
                font-weight: bold;
            }
            .${wrapperClass} a:hover {
                ${styles[widget.getMode()].linkFont}
                font-weight: bold;
            }
        `
        wrapper.appendChild(styleElement)

        // Create overall grid structure
        const element = document.createElement('div')
        element.style.cssText = styles.block + styles[widget.getMode()].background + styles[widget.getMode()].textFont
        element.className = wrapperClass
        wrapper.appendChild(element)

        // grid of three rows
        const titleRow = document.createElement('div')
        titleRow.style.cssText = styles.headerRow
        element.appendChild(titleRow)
        titleRow.appendChild(createTitleRow('DuckDuckGo', textButton))

        const contentRow = document.createElement('div')
        contentRow.style.cssText = styles.content

        if (img) {
            const imageRow = document.createElement('div')
            imageRow.style.cssText = styles.imgRow
            const imgElement = document.createElement('img')
            imgElement.style.cssText = styles.icon
            imgElement.setAttribute('src', img)
            imgElement.setAttribute('height', '70px')
            imageRow.appendChild(imgElement)
            element.appendChild(imageRow)
        }

        const contentTitle = document.createElement('div')
        contentTitle.style.cssText = styles.contentTitle
        if (entityData[widget.entity].simpleVersion && widget.replaceSettings.simpleInfoTitle) {
            contentTitle.textContent = widget.replaceSettings.simpleInfoTitle
        } else {
            contentTitle.textContent = widget.replaceSettings.infoTitle
        }
        contentRow.appendChild(contentTitle)
        const contentText = document.createElement('div')
        contentText.style.cssText = styles.contentText
        if (entityData[widget.entity].simpleVersion && widget.replaceSettings.simpleInfoText) {
            contentText.textContent = widget.replaceSettings.simpleInfoText + ' '
        } else {
            contentText.textContent = widget.replaceSettings.infoText + ' '
        }
        contentText.appendChild(getLearnMoreLink())
        contentRow.appendChild(contentText)
        element.appendChild(contentRow)

        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        buttonRow.appendChild(button)
        contentRow.appendChild(buttonRow)

        return wrapper
    }
})()
