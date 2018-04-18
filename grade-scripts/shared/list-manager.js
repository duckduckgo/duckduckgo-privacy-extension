/**
 * Loads any lists that would normally be loaded/updated on the fly
 * in the app/extension
 */

const request = require('request')
const baseUrl = 'https://duckduckgo.com/contentblocking'

const listsToLoad = {
    surrogates: `${baseUrl}.js?l=surrogates`,
    https: `${baseUrl}.js?l=https2`,
    whitelist: `${baseUrl}/trackers-whitelist.txt`,
    entityList: `${baseUrl}.js?l=entitylist2`
}
let loadedLists = {}

let load = (listName) => {
    return new Promise((resolve, reject) => {
        request({
            method: 'get',
            url: listsToLoad[listName],
            gzip: true
        }, (err, res, body) => {
            if (err) { return reject(err) }

            let response

            // parse JSON response if it's JSON (some are plain text)
            try {
                response = JSON.parse(body)
            } catch (e) {
                response = body
            }

            resolve(response)
        })
    })
}

let loadLists = async () => {
    for (let listName in listsToLoad) {
        loadedLists[listName] = await load(listName)
    }
}

let getList = (listName) => loadedLists[listName]

module.exports = {
    loadLists,
    getList
}
