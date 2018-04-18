/**
 * Loads any lists that would normally be loaded/updated on the fly
 * in the app/extension
 */

const request = require('request')
const baseUrl = 'https://duckduckgo.com/contentblocking.js'

const listsToLoad = ['surrogates', 'https2', 'entitylist2']
let loadedLists = {}

let load = (listName) => {
    return new Promise((resolve, reject) => {
        request({
            method: 'get',
            url: `${baseUrl}?l=${listName}`,
            gzip: true
        }, (err, res, body) => {
            if (err) { return reject(err) }

            let response

            // parse JSON response if it's JSON (some are plain text)
            try {
                response = JSON.parse(body)
            } catch (e) {
                // ¯\_(ツ)_/¯
            }

            resolve(response)
        })
    })
}

let loadLists = async () => {
    for (let listName of listsToLoad) {
        loadedLists[listName] = await load(listName)
    }
}

let getList = (listName) => loadedLists[listName]

module.exports = {
    loadLists,
    getList
}
