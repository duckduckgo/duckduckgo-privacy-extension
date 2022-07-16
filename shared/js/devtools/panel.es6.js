import browser from 'webextension-polyfill'

const table = document.querySelector('#request-table')
const clearButton = document.getElementById('clear')
const refreshButton = document.getElementById('refresh')
const protectionButton = document.getElementById('protection')
const tabPicker = getSelectElementById('tab-picker')
const tdsOption = getSelectElementById('tds')
const displayFilters = document.querySelectorAll('#table-filter input')

/**
 * @param {string} id
 * @returns {HTMLSelectElement}
 */
function getSelectElementById(id) {
    // @ts-ignore
    return document.getElementById(id)
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function getInputElementById(id) {
    // @ts-ignore
    return document.getElementById(id)
}

/**
 * @param {HTMLElement} element
 * @returns {HTMLLinkElement}
 */
function assertLinkElement(element) {
    // @ts-ignore
    return element
}

/**
 * @param {Node} element
 * @returns {HTMLTableRowElement}
 */
function assertTableRowElement(element) {
    // @ts-ignore
    return element
}

function sendMessage (messageType, options, callback) {
    browser.runtime.sendMessage({ messageType, options }, callback)
}

/**
 * @param {(m: any) => HTMLTableRowElement} f
 * @returns {(m: any) => void}
 */
function addRequestRow(f) {
    return (m) => {
        const row = f(m)
        if (row) {
            // if duplicate request lines would be printed, we instead show a counter increment
            const prevRow = document.querySelector('tbody > tr:last-child')
            if (prevRow) {
                const prevRowCopy = assertTableRowElement(prevRow.cloneNode(true))
                prevRowCopy.querySelector('.action-count').textContent = ''
                if (prevRowCopy.innerHTML == row.innerHTML) {
                    const countElt = prevRow.querySelector('.action-count')
                    const prevCount = parseInt(countElt.textContent.replaceAll(/[ \[\]]/g, '') || '1')
                    countElt.textContent = ` [${prevCount + 1}]`
                } else {
                    table.appendChild(row)
                }
            } else {
                table.appendChild(row)
            }
        }
    }
}

let tabId = browser.devtools?.inspectedWindow?.tabId || parseInt(0 + new URL(document.location.href).searchParams.get('tabId'))

// Open the messaging port and re-open if disconnected. The connection will
// disconnect for MV3 builds when the background ServiceWorker becomes inactive.
globalThis.port
const openPort = (callback) => {
    globalThis.port = browser.runtime.connect()
    globalThis.port.onDisconnect.addListener(openPort)
}
openPort()

// fetch the list of configurable features from the config and create toggles for them.
const loadConfigurableFeatures = new Promise((resolve) => {
    sendMessage('getListContents', 'config', ({ data: config }) => {
        const features = Object.keys(config.features)
        features.forEach((feature) => {
            const btn = document.createElement('button')
            btn.id = feature
            btn.innerText = `${feature}: ???`
            document.querySelector('#protections').appendChild(btn)
            btn.addEventListener('click', () => {
                globalThis.port.postMessage({
                    action: `toggle${feature}`,
                    tabId
                })
            })
        })
        resolve(features)
    })
})

const actionIcons = {
    block: '🚫',
    redirect: '➡️',
    ignore: '⚠️'
}

/**
 * @returns {HTMLTableRowElement}
 */
function requestRowFromTemplate() {
    // @ts-ignore
    return document.getElementById('request-row').content.firstElementChild.cloneNode(true)
}

/**
 * @returns {HTMLTableRowElement}
 */
function cookieRowFromTemplate() {
    // @ts-ignore
    return document.getElementById('cookie-row').content.firstElementChild.cloneNode(true)
}

/**
 * @param {HTMLElement} element
 * @param {string} textName
 * @param {boolean} isEnabled
 */
function setupProtectionButton(element, textName, isEnabled) {
    element.innerText = `${textName}: ${isEnabled ? 'ON' : 'OFF'}`
    element.classList.add(`protection-button-${isEnabled ? 'on' : 'off'}`)
    element.classList.remove(`protection-button-${isEnabled ? 'off' : 'on'}`)
}

const actionHandlers = {
    tracker: addRequestRow((m) => {
        const { tracker, url, requestData, siteUrl } = m.message
        const row = requestRowFromTemplate()
        const cells = row.querySelectorAll('td')
        const toggleLink = assertLinkElement(row.querySelector('.block-toggle'))
        toggleLink.href = ''
        if (tracker.action === 'block') {
            toggleLink.innerText = 'I'
        } else {
            toggleLink.innerText = 'B'
        }
        toggleLink.addEventListener('click', (ev) => {
            ev.preventDefault()
            globalThis.port.postMessage({
                action: toggleLink.innerText,
                tabId,
                tracker,
                requestData,
                siteUrl
            })
            row.classList.remove(tracker.action)
            row.classList.add(toggleLink.innerText === 'I' ? 'ignore' : 'block')
        });
        cells[1].textContent = url
        cells[2].querySelector('.request-action').textContent = `${actionIcons[tracker.action]} ${tracker.action} (${tracker.reason})`
        cells[3].textContent = tracker.fullTrackerDomain
        cells[4].textContent = requestData.type
        row.classList.add(tracker.action)
        return row
    }),
    tabChange: (m) => {
        const tab = m.message
        const protectionDisabled = tab.site?.allowlisted || tab.site?.isBroken
        setupProtectionButton(protectionButton, 'Protection', !protectionDisabled)
        loadConfigurableFeatures.then((features) => {
            features.forEach((feature) => {
                const featureEnabled = tab.site?.enabledFeatures.includes(feature)
                const featureButton = document.getElementById(feature)
                setupProtectionButton(featureButton, feature, featureEnabled)
            })
        })
    },
    cookie: addRequestRow((m) => {
        const { action, kind, url, requestId, type } = m.message
        const rowId = `request-${requestId}`
        if (document.getElementById(rowId) !== null) {
            const row = document.getElementById(rowId)
            const cells = row.querySelectorAll('td')
            row.classList.add(kind)
            cells[3].textContent = `${cells[3].textContent}, ${kind}`
        } else {
            const row = cookieRowFromTemplate()
            row.id = rowId
            const cells = row.querySelectorAll('td')
            const cleanUrl = new URL(url)
            cleanUrl.search = ''
            cleanUrl.hash = ''
            cells[1].textContent = cleanUrl.href
            cells[2].querySelector('.request-action').textContent = `🍪 ${action}`
            cells[3].textContent = kind
            cells[4].textContent = type
            row.classList.add(kind)
            return row
        }
    }),
    jscookie: addRequestRow((m) => {
        const { documentUrl, action, reason, value, stack, scriptOrigins } = m.message
        const row = cookieRowFromTemplate()
        const cells = row.querySelectorAll('td')
        cells[1].textContent = documentUrl
        cells[2].querySelector('.request-action').textContent = `JS🍪 ${action} (${reason})`
        cells[3].textContent = scriptOrigins.join(',')
        appendCallStack(cells[3], stack)
        cells[4].textContent = value.split(';')[0]
        row.classList.add('jscookie')
        return row
    }),
    fingerprintingCanvas: addRequestRow((m) => {
        const { documentUrl, action, kind, stack, args } = m.message
        const row = cookieRowFromTemplate()
        const cells = row.querySelectorAll('td')
        cells[1].textContent = documentUrl
        cells[2].querySelector('.request-action').textContent = `Canvas ${action}`
        const argsOut = JSON.parse(args).join(', ')
        cells[3].setAttribute('colspan', '2')
        cells[4].remove()

        cells[3].textContent = `${kind}(${argsOut})`
        appendCallStack(cells[3], stack)

        row.classList.add('canvas')
        return row
    })
}

function appendCallStack (cell, stack) {
    if (stack) {
        // Shift off the first two of the stack as will be us.
        const lines = stack.split('\n')
        lines.shift()
        lines.shift()

        const details = document.createElement('details')
        const summary = document.createElement('summary')
        summary.textContent = 'Call stack'
        details.appendChild(summary)
        details.appendChild(document.createTextNode(lines.join('\n')))
        cell.appendChild(details)
    }
}

const searchBox = getInputElementById('search-box')

function shouldShowRow (row) {
    const className = row.classList[0]
    const filter = getInputElementById(`display-${className}`)
    const searchBoxValue = searchBox.value
    // empty search box is considered to be no filter
    // search box matches on the URL of the request
    const searchFilter = searchBoxValue === '' || row.cells[1].textContent.match(searchBoxValue)
    return searchFilter && (!filter || filter.checked)
}

function setRowVisible (row) {
    row.hidden = !shouldShowRow(row)
}

globalThis.port.onMessage.addListener((message) => {
    const m = JSON.parse(message)
    if (m.tabId === tabId) {
        if (actionHandlers[m.action]) {
            actionHandlers[m.action](m)
        }
        if (document.querySelector('tbody').lastChild) {
            setRowVisible(document.querySelector('tbody').lastChild)
        }
    }
})

function updateTabSelector () {
    browser.tabs.query({}, (tabs) => {
        while (tabPicker.firstChild !== null) {
            tabPicker.removeChild(tabPicker.firstChild)
        }
        const selectTabOption = document.createElement('option')
        selectTabOption.value = ''
        selectTabOption.innerText = '--Select Tab--'
        tabPicker.appendChild(selectTabOption)
        tabs.forEach((tab) => {
            if (tab.url.startsWith('http')) {
                const elem = document.createElement('option')
                elem.value = `${tab.id}`
                elem.innerText = tab.title
                if (tab.id === tabId) {
                    elem.setAttribute('selected', 'true')
                }
                tabPicker.appendChild(elem)
            }
        })
    })
}

if (!browser.devtools) {
    updateTabSelector()
    browser.tabs.onUpdated.addListener(updateTabSelector)
    tabPicker.addEventListener('change', () => {
        tabId = parseInt(tabPicker.selectedOptions[0].value)
        clear()
        globalThis.port.postMessage({ action: 'setTab', tabId })
    })
} else {
    tabPicker.hidden = true
}

if (tabId) {
    globalThis.port.postMessage({ action: 'setTab', tabId })
}

function clear () {
    while (table.lastChild) {
        table.removeChild(table.lastChild)
    }
}

// listeners for buttons and toggles
clearButton.addEventListener('click', clear)
refreshButton.addEventListener('click', () => {
    clear()
    if (browser.devtools) {
        browser.devtools.inspectedWindow.eval('window.location.reload();')
    } else {
        browser.tabs.reload(tabId)
    }
})
protectionButton.addEventListener('click', () => {
    globalThis.port.postMessage({
        action: 'toggleProtection',
        tabId
    })
})

sendMessage('getSetting', { name: 'tds-channel' }, (result) => {
    console.log('setting', result)
    const active = tdsOption.querySelector(`[value=${result}`)
    if (active) {
        active.setAttribute('selected', 'true')
    }
})

tdsOption.addEventListener('change', (e) => {
    sendMessage('updateSetting', {
        name: 'tds-channel',
        value: tdsOption.selectedOptions[0].value
    }, () => {
        sendMessage('reloadList', 'tds')
    })
})

displayFilters.forEach((input) => {
    input.addEventListener('change', () => {
        document.querySelectorAll('tbody > tr').forEach(setRowVisible)
    })
})

/**
 * Observes the dev settings for resizing to ensure the table head sticks correctly to the bottom of the settings.
 */
const settingsResizeObserver = new ResizeObserver(function (entries) {
    const height = entries[0].contentRect.height;
    document.querySelector('thead').style['top'] = `${height}px`
})
settingsResizeObserver.observe(document.getElementById('settings-panel'))
