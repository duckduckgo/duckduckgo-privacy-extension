/**
 * Loads any lists that would normally be loaded/updated on the fly
 * in the app/extension
 */

const request = require('request')
const fs = require('fs')
const baseUrl = 'https://duckduckgo.com/contentblocking'

const listsToLoad = {
    surrogates: `${baseUrl}.js?l=surrogates`,
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

let getSymlinkedLocalList = (fileName) => {
    let path = `data/symlinked/${fileName}`
    let list

    try {
        list = fs.readFileSync(path, { encoding: 'utf8' })
    } catch (e) {
        throw new Error(`couldn't find and parse list ${fileName}, tried looking in: ${path}`)
    }

    if (fileName.match(/\.txt$/)) {
        list = list.trim().split('\n')
    } else if (fileName.match(/\.json$/)) {
        list = JSON.parse(list)
    }

    return list
}

let loadLists = async () => {
    for (let listName in listsToLoad) {
        loadedLists[listName] = await load(listName)
    }

    // large https lists don't have an endpoint just yet
    loadedLists.https = getSymlinkedLocalList('https_list.txt')
    loadedLists.httpsAutoUpgrade = getSymlinkedLocalList('https_autoupgrade_list.txt')
}

let getList = (listName) => loadedLists[listName]

module.exports = {
    loadLists,
    getList
}
