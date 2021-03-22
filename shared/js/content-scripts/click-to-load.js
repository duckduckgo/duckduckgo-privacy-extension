(function clickToLoad () {
    let appID
    const loadingImages = {
        darkMode: '',
        lightMode: ''
    }
    let logoImg
    const entities = []
    const ddgFont = chrome.runtime.getURL('public/font/ProximaNova-Reg-webfont.woff')

    const styles = {
        fontStyle: `
            @font-face{
                font-family: DuckDuckGo;
                src: url(${ddgFont});
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
        button: `
            border-radius: 8px;

            padding: 11px 22px;
            font-weight: bold;
            margin: auto;
            border-color: #3969EF;
            border: none;

            font-family: DuckDuckGo;
            font-size: 14px;
        `,
        buttonTextContainer: `
            display: flex; 
            flex-direction: row;
        `,
        headerRow: `

        `,
        block: `
            border: 1px solid #C3C3C3;
            box-sizing: border-box;
            border-radius: 10px;
            max-width: 600px;
            min-height: 300px;
            margin: auto;
            flex-direction: column;

            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.1);
            
            font-family: DuckDuckGo;
            line-height: 1;
        `,
        content: `
            display: flex;
            flex-direction: column;
            margin: 20px 0px;
        `,
        titleBox: `
            display: flex;
            padding: 13px 13px 0px 13px;
            max-height: 44px;
            border-bottom: 1px solid;
            border-color: rgba(196, 196, 196, 0.3);
        `,
        title: `
            line-height: 1.4;
            font-size: 15px;
            margin: 0 10px;
            flex-basis: 100%;
        `,
        headerLinkContainer: `
            flex-basis: 60%;
            display: grid;
            justify-content: flex-end;
        `,
        headerLink: `
            line-height: 1.4;
            font-size: 15px;
            font-weight: bold;
            text-decoration: none;
            cursor: pointer;
        `,
        buttonRow: `
            display: flex;
            height: 100%
            flex-direction: row;
            margin: 0px auto 36px;
        `,
        contentTitle: `
            font-family: DuckDuckGo;
            font-size: 17px;
            font-weight: bold;
            margin: 20px auto 10px;
        `,
        contentText: `
            font-family: DuckDuckGo;
            font-size: 14px;
            line-height: 21px;
            margin: auto;
            padding: 0px 40px;
            text-align: center;
        `,
        icon: `
            height: 70px;
            margin: auto;
        `,
        logo: `
            flex-basis: 0%;
            min-width: 20px;
            height: 25px;
        `,
        logoImg: `
            height: 20px;
        `
    }

    class DuckWidget {
        constructor (widgetData, originalElement, entity) {
            this.clickAction = {...widgetData.clickAction} // shallow copy
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
                    value = attrSettings.default
                }
                this.dataElements[attrName] = value
            }
        }

        getTargetURL () {
            // This has to be done lazy, since some required data may not be
            // captured until after page scripts run.
            this.copySocialDataFields()
            return this.clickAction.targetURL
        }

        // Determine if element should render in dark mode
        getMode () {
            const mode = this.originalElement.getAttribute('data-colorscheme')
            if (mode === 'dark') {
                return 'darkMode'
            }
            return 'lightMode'
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
         */
        fadeOutElement (element) {
            return new Promise((resolve, reject) => {
                let opacity = 1
                const originStyle = element.style.cssText
                const fadeOut = setInterval(function () {
                    opacity -= 0.03
                    element.style.cssText = originStyle + `opacity: ${opacity};`
                    if (opacity <= 0) {
                        clearInterval(fadeOut)
                        resolve()
                    }
                }, 10)
            })
        }

        fadeInElement (element) {
            return new Promise((resolve, reject) => {
                let opacity = 0
                const originStyle = element.style.cssText
                const fadeIn = setInterval(function () {
                    opacity += 0.03
                    element.style.cssText = originStyle + `opacity: ${opacity};`
                    if (opacity >= 1) {
                        clearInterval(fadeIn)
                        resolve()
                    }
                }, 10)
            })
        }

        clickFunction (originalElement, replacementElement, shouldFade = true) {
            let clicked = false
            return function handleClick (e) {
                // Ensure that the click is created by a user event
                if (e.isTrusted && !clicked) {
                    // prevent double clicks from adding more animations
                    clicked = true
                    enableSocialTracker(this.entity, false, false)
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
                    const fadeIn = document.createElement('div')
                    fadeIn.style.cssText = 'display: none; opacity: 0;'

                    // Loading animation (FB can take some time to load)
                    const loadingImg = document.createElement('img')
                    loadingImg.setAttribute('src', loadingImages[this.getMode()])
                    loadingImg.style.cssText = 'display: block; margin-right: 8px;'

                    // Always add the animation to the button, regardless of click source
                    if (e.srcElement.nodeName === 'BUTTON') {
                        e.srcElement.firstElementChild.innerHTML = loadingImg.outerHTML + e.srcElement.firstElementChild.innerHTML
                    } else {
                        // try to find the button
                        let el = e.srcElement
                        let button = null
                        while (button === null && el !== null) {
                            button = el.querySelector('button')
                            el = el.parentElement
                        }
                        if (button) {
                            button.firstElementChild.innerHTML = loadingImg.outerHTML + button.firstElementChild.innerHTML
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
        }
    }

    function init (extensionResponseData) {
        for (const entity of Object.keys(extensionResponseData)) {
            entities.push(entity)
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
        let button
        if (widgetData.replaceSettings.type === 'button') {
            // Create a button to replace old element
            button = makeButton(widgetData.replaceSettings.buttonText, widget.getMode())
            button.addEventListener('click', widget.clickFunction(originalElement, button))
            parent.replaceChild(button, originalElement)
        }
        if (widgetData.replaceSettings.type === 'dialog') {
            chrome.runtime.sendMessage({
                getImage: widgetData.replaceSettings.icon
            }, function putButton (icon) {
                button = makeButton(widgetData.replaceSettings.buttonText, widget.getMode())
                const textButton = makeTextButton(widgetData.replaceSettings.buttonText, widget.getMode())
                const el = createContentBlock(
                    widget,
                    button,
                    textButton,
                    icon)
                button.addEventListener('click', widget.clickFunction(originalElement, el))
                textButton.addEventListener('click', widget.clickFunction(originalElement, el))
                parent.replaceChild(el, originalElement)
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

    function makeButton (buttonText, mode) {
        const button = document.createElement('button')
        button.style.cssText = styles.button + styles[mode].buttonBackground
        const textContainer = document.createElement('div')
        textContainer.style.cssText = styles.buttonTextContainer + styles[mode].buttonFont
        textContainer.innerHTML = buttonText
        button.appendChild(textContainer)
        return button
    }

    /* Make a text link */
    function makeTextButton (linkText, mode) {
        const linkElement = document.createElement('a')
        linkElement.style.cssText = styles.headerLink + styles[mode].linkFont
        linkElement.innerHTML = linkText
        return linkElement
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
        logoElement.setAttribute('height', '20px')
        logoElement.style.cssText = styles.logoImg
        logoContainer.appendChild(logoElement)
        row.appendChild(logoContainer)

        // Content box title
        const msgElement = document.createElement('div')
        msgElement.innerHTML = message
        msgElement.style.cssText = styles.title
        row.appendChild(msgElement)

        // Text link
        const linkContainer = document.createElement('div')
        linkContainer.style.cssText = styles.headerLinkContainer
        linkContainer.appendChild(textButton)
        row.appendChild(linkContainer)
        return row
    }

    // Create the content block to replace other divs/iframes with
    function createContentBlock (widget, button, textButton, img) {
        // Create overall grid structure
        const element = document.createElement('div')
        element.style.cssText = styles.block + styles[widget.getMode()].background + styles[widget.getMode()].textFont
        // Style element includes our font
        const styleElement = document.createElement('style')
        styleElement.innerHTML = styles.fontStyle + `a { ${styles[widget.getMode()].linkFont} }`
        element.appendChild(styleElement)
        // grid of three rows
        const titleRow = document.createElement('div')
        titleRow.style.cssText = styles.headerRow
        element.appendChild(titleRow)
        titleRow.appendChild(createTitleRow('DuckDuckGo Privacy Essentials', textButton))

        const contentRow = document.createElement('div')
        contentRow.style.cssText = styles.content
        if (img) {
            const imgElement = document.createElement('img')
            imgElement.style.cssText = styles.icon
            imgElement.setAttribute('src', img)
            imgElement.setAttribute('height', '70px')
            contentRow.appendChild(imgElement)
        }
        const contentTitle = document.createElement('div')
        contentTitle.style.cssText = styles.contentTitle
        contentTitle.innerHTML = widget.replaceSettings.infoTitle
        contentRow.appendChild(contentTitle)
        const contentText = document.createElement('div')
        contentText.style.cssText = styles.contentText
        contentText.innerHTML = widget.replaceSettings.infoText
        contentRow.appendChild(contentText)
        element.appendChild(contentRow)

        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        buttonRow.appendChild(button)
        element.appendChild(buttonRow)

        return element
    }

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
            enableSocialTracker(entity, false, true)
            window.dispatchEvent(new CustomEvent(`Run${entity}Login`))
        }
    })
})()
