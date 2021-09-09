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
                background: #6E90F7;
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
            border-radius: 4px;

            padding: 11px 22px;
            font-weight: bold;
            margin-bottom: 8px;
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
            align-items: center;
        `,
        buttonRow: `
            display: flex;
            flex-direction: column;
            margin-bottom: 8px;
        `,
        modal: `
            width: 300px;
            margin: auto;
            background-color: #FFFFFF;
            position: absolute;
            left: calc(100% - 300px - 24px);
            top: 6px;
            display: block;
            box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.1);
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
            padding-left: 16px;
            padding-right: 16px;
            display: flex;
            flex-direction: column;
        `,
        modalContentTitle: `
            font-family: DuckDuckGoPrivacyEssentialsBold;
            font-size: 16px;
            font-weight: bold;
            line-height: 20px;
            text-align: center;
            margin: auto;
            margin-bottom: 16px;
            color: #333333;
        `,
        modalContentText: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 14px;
            line-height: 20px;
            text-align: center;
            letter-spacing: -0.24px;
            color: #333333;
            margin-bottom: 16px;
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
        `,
        closeContainer: `
            width: 100%;
            height: 48px;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-end;
        `,
        closeButton: `
            font-family: DuckDuckGoPrivacyEssentials;
            font-size: 18px;
        `
    }

    function toggleAllowlisted (status) {
        window.chrome.runtime.sendMessage({ 
            toggleSiteProtections: true, 
            domain: window.location.hostname, 
            status: status 
        }, () => window.chrome.runtime.lastError)
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

    function makeReportPromptModal () {
        console.log('Making report modal')
        const modalContainer = document.createElement('div')
        modalContainer.style.cssText = styles.modalContainer
        const styleElement = document.createElement('style')
        styleElement.textContent = styles.fontStyle
        modalContainer.appendChild(styleElement)

        const modal = document.createElement('div')
        modal.style.cssText = styles.modal

        const modalContent = document.createElement('div')
        modalContent.style.cssText = styles.modalContent

        const closeContainer = document.createElement('div')
        closeContainer.style.cssText = styles.closeContainer

        const closeButton = document.createElement('div')
        closeButton.style.cssText = styles.closeButton
        closeButton.textContent = 'x'
        closeButton.addEventListener('click', function() {
            document.body.removeChild(modalContainer)
        })

        closeContainer.appendChild(closeButton)
        modalContent.appendChild(closeContainer)

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = 'Do you want to send a report? This helps us improve your experience.'

        modalContent.appendChild(title)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        const notBrokenButton = makeButton('Yes, send a report', 'lightMode')
        notBrokenButton.style.cssText += styles.modalButton
        notBrokenButton.addEventListener('click', function notBroken () {
            var reportUrl = chrome.runtime.getURL('html/feedback.html')
            reportUrl += `?broken=true&url=${encodeURIComponent(window.location)}`
            window.chrome.runtime.sendMessage({ openBreakageReport: true, url: reportUrl })
            document.body.removeChild(modalContainer, () => window.chrome.runtime.lastError)
        })
        const isBrokenButton = makeButton('No thanks', 'cancelMode')
        isBrokenButton.style.cssText += styles.modalButton
        isBrokenButton.addEventListener('click', function isBroken () {
            document.body.removeChild(modalContainer)
        })

        buttonRow.appendChild(notBrokenButton)
        buttonRow.appendChild(isBrokenButton)
        modalContent.appendChild(buttonRow)

        modal.appendChild(modalContent)
        modalContainer.appendChild(modal)

        return modalContainer
    }

    function makeConfirmFixModal () {
        const modalContainer = document.createElement('div')
        modalContainer.style.cssText = styles.modalContainer
        const styleElement = document.createElement('style')
        styleElement.textContent = styles.fontStyle
        modalContainer.appendChild(styleElement)

        const modal = document.createElement('div')
        modal.style.cssText = styles.modal

        const modalContent = document.createElement('div')
        modalContent.style.cssText = styles.modalContent

        const closeContainer = document.createElement('div')
        closeContainer.style.cssText = styles.closeContainer

        const closeButton = document.createElement('div')
        closeButton.style.cssText = styles.closeButton
        closeButton.textContent = 'x'
        closeButton.addEventListener('click', function() {
            document.body.removeChild(modalContainer)
        })

        closeContainer.appendChild(closeButton)
        modalContent.appendChild(closeContainer)

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = 'Did disabling Privacy Protection fix the problem you experienced?'

        modalContent.appendChild(title)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        const notBrokenButton = makeButton('No', 'lightMode')
        notBrokenButton.style.cssText += styles.modalButton
        notBrokenButton.addEventListener('click', function notBroken () {
            siteNotFixed(modalContainer, modalContent)
        })
        const isBrokenButton = makeButton('Yes', 'lightMode')
        isBrokenButton.style.cssText += styles.modalButton
        isBrokenButton.addEventListener('click', function isBroken () {
            confirmSiteFixed(modalContainer, modalContent)
        })

        buttonRow.appendChild(notBrokenButton)
        buttonRow.appendChild(isBrokenButton)
        modalContent.appendChild(buttonRow)

        modal.appendChild(modalContent)
        modalContainer.appendChild(modal)

        return modalContainer
    }

    function confirmSiteFixed (modalContainer, modalContent) {

        // Remove modal content
        while (modalContent.childNodes.length > 1) {
            modalContent.removeChild(modalContent.lastChild)
        }

        const textContainer = document.createElement('div')
        textContainer.style.cssText = styles.modalTextContainer

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = "Whew, glad it's fixed!"

        textContainer.appendChild(title)

        const message = document.createElement('div')
        message.style.cssText = styles.modalContentText
        message.innerHTML = `We'll leave Privacy Protection disabled on <span style="font-family: DuckDuckGoPrivacyEssentialsBold;">${window.location.hostname}</span> so the site works as expected. You can always change this later in Settings.`

        textContainer.appendChild(message)
        modalContent.appendChild(textContainer)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        const gotItButton = makeButton('Got it', 'lightMode')
        gotItButton.style.cssText += styles.modalButton
        gotItButton.addEventListener('click', function notFixed () {
            document.body.removeChild(modalContainer)
        })

        buttonRow.appendChild(gotItButton)
        modalContent.appendChild(buttonRow)
    }

    function siteNotFixed (modalContainer, modalContent) {
        toggleAllowlisted(false)

        // Remove modal content
        while (modalContent.childNodes.length > 1) {
            modalContent.removeChild(modalContent.lastChild)
        }

        const textContainer = document.createElement('div')
        textContainer.style.cssText = styles.modalTextContainer

        const title = document.createElement('div')
        title.style.cssText = styles.modalContentTitle
        title.textContent = "Sorry that didn't fix it."

        textContainer.appendChild(title)

        const message = document.createElement('div')
        message.style.cssText = styles.modalContentText
        message.innerHTML = `We've reenabled Privacy Protection to ensure you're still protected on <span style="font-family: DuckDuckGoPrivacyEssentialsBold;">${window.location.hostname}</span>.`

        textContainer.appendChild(message)
        modalContent.appendChild(textContainer)

        // Buttons
        const buttonRow = document.createElement('div')
        buttonRow.style.cssText = styles.buttonRow
        const gotItButton = makeButton('Got it', 'lightMode')
        gotItButton.style.cssText += styles.modalButton
        gotItButton.addEventListener('click', function notFixed () {
            document.body.removeChild(modalContainer)
        })
        const keepDisabledButton = makeButton('Keep Privacy Protection disabled', 'cancelMode')
        keepDisabledButton.style.cssText += styles.modalButton
        keepDisabledButton.addEventListener('click', function notFixed () {
            toggleAllowlisted(true)
            document.body.removeChild(modalContainer)
            window.location.reload()
        })

        buttonRow.appendChild(gotItButton)
        buttonRow.appendChild(keepDisabledButton)
        modalContent.appendChild(buttonRow)
    }

    var modalContainer;
    if (window.breakageModel === 'confirmFix') {
        modalContainer = makeConfirmFixModal()
    } else if (window.breakageModel === 'reportPrompt') {
        modalContainer = makeReportPromptModal()
    } else { 
        console.log('Unknown breakage model: ', window.breakageModel)
    }
    document.body.insertBefore(modalContainer, document.body.childNodes[0])
})()
