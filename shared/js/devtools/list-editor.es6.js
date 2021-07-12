const constants = require('../../data/constants')

const listPicker = document.getElementById('list-picker')
const listEditor = document.getElementById('list-content')
const saveButton = document.getElementById('save')

const lists = constants.tdsLists
let selected = lists[0].name

function getListFormat (name) {
    return lists.find(l => l.name === name)?.format
}

// build switcher options
lists.forEach(({ name }) => {
    const option = document.createElement('option')
    option.value = name
    option.innerText = name
    listPicker.appendChild(option)
})

function listSwitcher () {
    selected = listPicker.selectedOptions[0].value
    loadList(selected)
    saveButton.removeAttribute('disabled')
}
listPicker.addEventListener('change', listSwitcher)
listSwitcher()

function loadList (name) {
    chrome.runtime.sendMessage({
        getListContents: name
    }, ({ etag, data }) => {
        const value = getListFormat(name) === 'json' ? JSON.stringify(data, null, '  ') : data
        document.querySelector('#list-content').value = value
    })
}

function saveList (name) {
    const value = listEditor.value
    chrome.runtime.sendMessage({
        setListContents: name,
        value: getListFormat(name) === 'json' ? JSON.parse(value) : value
    }, () => loadList(name))
}

function reloadList (name) {
    chrome.runtime.sendMessage({
        reloadList: name
    }, () => loadList(name))
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
