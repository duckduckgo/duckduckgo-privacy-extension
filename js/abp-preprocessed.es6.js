/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
abp = require('abp-filter-parser');

easylists = {
    privacy: {
        url: 'https://jason.duckduckgo.com/contentblocking.js?l=easyprivacy',
        parsed: {},
    },
    general: {
        url: 'https://jason.duckduckgo.com/contentblocking.js?l=easylist',
        parsed: {},
    }
};

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to 
 * the easyLists object.
 */
function updateLists () {
    for (let list in easylists) {
        let url = easylists[list].url
        console.log("Checking for list update: ", list)

        load.loadExtensionFile({url: url, source: 'external', etag: settings.getSetting(list + '-etag')}, (listData, response) => {
            let newEtag = response.getResponseHeader('etag')

            console.log("Updating list: ", list)
        
            // sync new etag to storage
            settings.updateSetting(list + '-etag', newEtag)

            abp.parse(listData, easylists[list].parsed)
            easylists[list].loaded = true;
        });
    }
}

// Make sure the list updater runs on start up
updateLists()

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'updateEasyLists') {
        updateLists()
    }
});

// set an alarm to recheck the lists
chrome.alarms.create('updateEasyLists', {periodInMinutes: 1})
