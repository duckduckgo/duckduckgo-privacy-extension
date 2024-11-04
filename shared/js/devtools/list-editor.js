const constants = require('../../data/constants')

const listPicker = document.getElementById('list-picker')
const listEditor = document.getElementById('list-content')
const saveButton = document.getElementById('save')

const lists = constants.tdsLists
let selected = lists[0].name

function getListFormat(name) {
    return lists.find((l) => l.name === name)?.format
}

// build switcher options
lists.forEach(({ name }) => {
    const button = document.createElement('button')
    button.innerText = name
    button.classList.add('silver-bg')
    button.addEventListener('click', listSwitcher)
    listPicker.appendChild(button)
})

function listSwitcher(event) {
    document.querySelectorAll('#list-picker button').forEach((btn) => {
        btn.classList.remove('selected')
    })
    event.target.classList.add('selected')
    selected = event.target.innerText.toLowerCase()
    loadList(selected)
    saveButton.removeAttribute('disabled')
}

document.querySelector('#list-picker button').click()

function sendMessage(messageType, options, callback) {
    chrome.runtime.sendMessage({ messageType, options }, callback)
}

function loadList(name) {
    sendMessage('getListContents', name, ({ etag, data }) => {
        const value = getListFormat(name) === 'json' ? JSON.stringify(data, null, '  ') : data
        document.querySelector('#list-content').value = value
    })
}

function saveList(name) {
    const value = listEditor.value
    sendMessage(
        'setListContents',
        {
            name,
            value: getListFormat(name) === 'json' ? JSON.parse(value) : value,
        },
        () => loadList(name),
    )
}

function reloadList(name) {
    sendMessage('reloadList', name, () => loadList(name))
}

saveButton.addEventListener('click', () => {
    saveList(selected)
})

document.getElementById('reload').addEventListener('click', () => {
    reloadList(selected)
})

listEditor.addEventListener('keypress', () => {
    setTimeout(() => {
        console.log('changed', getListFormat(selected))
        if (getListFormat(selected) === 'json') {
            try {
                saveButton.removeAttribute('disabled')
            } catch (e) {
                console.log('parse error')
                saveButton.setAttribute('disabled', true)
            }
        } else {
            saveButton.removeAttribute('disabled')
        }
    }, 0)
})
