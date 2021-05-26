const table = document.querySelector('#request-table')
const clearButton = document.getElementById('clear')
const refreshButton = document.getElementById('refresh')
const protectionButton = document.getElementById('protection')
const tabPicker = document.getElementById('tab-picker')
const tdsOption = document.getElementById('tds')
const displayFilters = document.querySelectorAll('#table-filter input')

let tabId = chrome.devtools?.inspectedWindow?.tabId || parseInt(0 + new URL(document.location.href).searchParams.get('tabId'))
const port = chrome.runtime.connect()
const features = [
    'canvas',
    'audio',
    'referrer',
    'floc',
    'autofill',
    'cookie',
    'gpc'
]

const actionIcons = {
    block: '🚫',
    redirect: '➡️',
    ignore: '⚠️'
}

function shouldShowRow (className) {
    const filter = document.getElementById(`display-${className}`)
    return !filter || filter.checked
}

function setRowVisible (row) {
    row.hidden = !shouldShowRow(row.classList[0])
}

port.onMessage.addListener((message) => {
    const m = JSON.parse(message)
    if (m.tabId === tabId) {
        if (m.action === 'tracker') {
            const { tracker, url, requestData, siteUrl } = m.message
            const row = document.getElementById('request-row').content.firstElementChild.cloneNode(true)
            const cells = row.querySelectorAll('td')
            const toggleLink = row.querySelector('.block-toggle')
            toggleLink.href = ''
            if (tracker.action === 'block') {
                toggleLink.innerText = 'I'
            } else {
                toggleLink.innerText = 'B'
            }
            toggleLink.addEventListener('click', (ev) => {
                ev.preventDefault()
                port.postMessage({
                    action: toggleLink.innerText,
                    tabId,
                    tracker,
                    requestData,
                    siteUrl
                })
                row.classList.remove(tracker.action)
                row.classList.add(toggleLink.innerText === 'I' ? 'ignore' : 'block')
            });
            [url, `${actionIcons[tracker.action]} ${tracker.action} (${tracker.reason})`, tracker.fullTrackerDomain, requestData.type].forEach((text, i) => {
                cells[i + 1].innerText = text
            })
            row.classList.add(tracker.action)
            table.appendChild(row)
        } else if (m.action === 'tabChange') {
            const tab = m.message
            protectionButton.innerText = `Protection: ${tab.site?.whitelisted || tab.site?.isBroken ? 'OFF' : 'ON'}`
            features.forEach((feature) => {
                document.getElementById(feature).innerText = `${feature}: ${tab.site?.brokenFeatures.includes(feature) ? 'OFF' : 'ON'}`
            })
        } else if (m.action === 'cookie') {
            const { action, kind, url, requestId, type } = m.message
            const rowId = `request-${requestId}`
            if (document.getElementById(rowId) !== null) {
                const row = document.getElementById(rowId)
                const cells = row.querySelectorAll('td')
                row.classList.add(kind)
                cells[3].textContent = `${cells[3].textContent}, ${kind}`
            } else {
                const row = document.getElementById('cookie-row').content.firstElementChild.cloneNode(true)
                row.id = rowId
                const cells = row.querySelectorAll('td')
                const cleanUrl = new URL(url)
                cleanUrl.search = ''
                cleanUrl.hash = ''
                cells[1].textContent = cleanUrl.href
                cells[2].textContent = `🍪 ${action}`
                cells[3].textContent = kind
                cells[4].textContent = type
                row.classList.add(kind)
                table.appendChild(row)
            }
        } else if (m.action === 'jscookie') {
            const { documentUrl, action, reason, value, scriptOrigins } = m.message
            const row = document.getElementById('cookie-row').content.firstElementChild.cloneNode(true)
            const cells = row.querySelectorAll('td')
            cells[1].textContent = documentUrl
            cells[2].textContent = `JS🍪 ${action} (${reason})`
            cells[3].textContent = scriptOrigins.join(',')
            cells[4].textContent = value.split(';')[0]
            row.classList.add('jscookie')
            table.appendChild(row)
        } else if (m.action === 'canvas') {
            const { documentUrl, action, kind } = m.message
            const row = document.getElementById('cookie-row').content.firstElementChild.cloneNode(true)
            const cells = row.querySelectorAll('td')
            cells[1].textContent = documentUrl
            cells[2].textContent = `Canvas ${action}`
            cells[3].textContent = kind
            row.classList.add('canvas')
            table.appendChild(row)
        }
        setRowVisible(document.querySelector('tbody').lastChild)
    }
})

function updateTabSelector () {
    chrome.tabs.query({}, (tabs) => {
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
                elem.value = tab.id
                elem.innerText = tab.title
                if (tab.id === tabId) {
                    elem.setAttribute('selected', true)
                }
                tabPicker.appendChild(elem)
            }
        })
    })
}

if (!chrome.devtools) {
    updateTabSelector()
    chrome.tabs.onUpdated.addListener(updateTabSelector)
    tabPicker.addEventListener('change', () => {
        tabId = parseInt(tabPicker.selectedOptions[0].value)
        clear()
        port.postMessage({ action: 'setTab', tabId })
    })
} else {
    tabPicker.hidden = true
}

if (tabId) {
    port.postMessage({ action: 'setTab', tabId })
}

function clear () {
    while (table.lastChild) {
        table.removeChild(table.lastChild)
    }
}

// buttons and toggles
clearButton.addEventListener('click', clear)
refreshButton.addEventListener('click', () => {
    clear()
    if (chrome.devtools) {
        chrome.devtools.inspectedWindow.eval('window.location.reload();')
    } else {
        chrome.tabs.reload(tabId)
    }
})
protectionButton.addEventListener('click', () => {
    port.postMessage({
        action: 'toggleProtection',
        tabId
    })
})

features.forEach((feature) => {
    const btn = document.createElement('button')
    btn.id = feature
    btn.innerText = `${feature}: ???`
    document.querySelector('.header').appendChild(btn)
    btn.addEventListener('click', () => {
        port.postMessage({
            action: `toggle${feature}`,
            tabId
        })
    })
})

chrome.runtime.sendMessage({ getSetting: { name: 'tds-channel' } }, (result) => {
    console.log('setting', result)
    const active = tdsOption.querySelector(`[value=${result}`)
    if (active) {
        active.setAttribute('selected', true)
    }
})

tdsOption.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
        updateSetting: {
            name: 'tds-channel',
            value: tdsOption.selectedOptions[0].value
        }
    }, () => {
        chrome.runtime.sendMessage({ reloadList: 'tds' })
    })
})

displayFilters.forEach((input) => {
    input.addEventListener('change', () => {
        document.querySelectorAll('tr').forEach(setRowVisible)
    })
})
