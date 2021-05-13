(function breakageFlow () {
    const ddgFont = chrome.runtime.getURL('public/font/ProximaNova-Reg-webfont.woff')
    const ddgFontBold = chrome.runtime.getURL('public/font/ProximaNova-Bold-webfont.woff2')

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
            margin: 0px 6px;
            border-color: #3969EF;
            border: none;

            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 14px;

            position: relative;
            cursor: pointer;
            box-shadow: none;
            z-index: 2147483646;
        `,
        buttonTextContainer: `
            display: flex; 
            flex-direction: row;
            align-items: center;
        `,
        modal: `
            width: 425px;
            margin: auto;
            background-color: #FFFFFF;
            position: absolute;
            left: calc(100% - 425px - 24px);
            top: 6px;
            display: block;
            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
        `,
        disableProtectionsModal: `
            width: 525px;
            margin: auto;
            background-color: #FFFFFF;
            position: absolute;
            left: calc(100% - 525px - 24px);
            top: 6px;
            display: block;
            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 12px;
        `,
        modalContainer: `
            height: 100%;
            width: 100%;
            z-index: 2147483647;
            display: block;
            position: fixed;
        `,
        modalContent: `
            padding: 24px;
            display: flex;
            flex-direction: row;
        `,
        modalContentTitle: `
            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 17px;
            font-weight: bold;
            line-height: 21px;
            margin: auto;
        `,
        modalContentText: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 14px;
            line-height: 21px;
        `,
        modalTextContainer: `
            display: flex;
            flex-direction: column;
            align-content: center;
        `,
        modalIcon: `
            display: block;
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
        `
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

    function makeModal () {
        const modalContainer = document.createElement('div')
        modalContainer.style.cssText = styles.modalContainer
        const styleElement = document.createElement('style')
        styleElement.textContent = styles.fontStyle
        modalContainer.appendChild(styleElement)

        const modal = document.createElement('div')
        modal.style.cssText = styles.modal

        const modalContent = document.createElement('div')
        modalContent.style.cssText = styles.modalContent

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = 'Is this site broken?'

        modalContent.appendChild(title)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = 'margin:auto;'
        const allowButton = makeButton('Yes', 'lightMode')
        allowButton.style.cssText += styles.modalButton + 'margin-right: 15px;'
        allowButton.addEventListener('click', function isBroken () {
            confirmSiteBroken(modalContainer, modalContent)
        })
        const rejectButton = makeButton('No', 'cancelMode')
        rejectButton.style.cssText += styles.modalButton + 'float: right;'
        rejectButton.addEventListener('click', function notBroken () {
            document.body.removeChild(modalContainer)
        })

        buttonRow.appendChild(allowButton)
        buttonRow.appendChild(rejectButton)
        modalContent.appendChild(buttonRow)

        modal.appendChild(modalContent)
        modalContainer.appendChild(modal)

        return modalContainer
    }

    function confirmSiteBroken (modalContainer, modalContent) {
        window.chrome.runtime.sendMessage({ toggleSiteProtections: true }, () => window.chrome.runtime.lastError)

        while (modalContent.lastChild) {
            modalContent.removeChild(modalContent.lastChild)
        }

        const textContainer = document.createElement('div')
        textContainer.style.cssText = styles.modalTextContainer

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = "Let's disable site protections for this site."

        textContainer.appendChild(title)

        const message = document.createElement('div')
        message.style.cssText = styles.modalContentText
        message.textContent = 'Did this fix the issue? (Try reloading the page)'

        textContainer.appendChild(message)
        modalContent.appendChild(textContainer)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = 'margin:auto;'
        const allowButton = makeButton('Yes', 'lightMode')
        allowButton.style.cssText += styles.modalButton + 'margin-right: 15px;'
        allowButton.addEventListener('click', function problemFixed () {
            document.body.removeChild(modalContainer)
        })
        const rejectButton = makeButton('No', 'cancelMode')
        rejectButton.style.cssText += styles.modalButton + 'float: right;'
        rejectButton.addEventListener('click', function notFixed () {
            document.body.removeChild(modalContainer)
        })

        buttonRow.appendChild(allowButton)
        buttonRow.appendChild(rejectButton)
        modalContent.appendChild(buttonRow)
        modalContainer.childNodes[1].style.cssText = styles.disableProtectionsModal
    }

    const modalContainer = makeModal()
    document.body.insertBefore(modalContainer, document.body.childNodes[0])
})()
