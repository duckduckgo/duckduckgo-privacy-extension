/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
abp = require('abp-filter-parser');

let lists = {
    easylists : {
        privacy: {
            url: 'https://duckduckgo.com/contentblocking.js?l=easyprivacy',
            parsed: {},
        },
        general: {
            url: 'https://duckduckgo.com/contentblocking.js?l=easylist',
            parsed: {},
        }
    },
    whitelists: {
        preWhitelist: {
            url: 'https://github.com/easylist/easylist/blob/master/easylist/easylist_whitelist.txt',
            parsed: {}
        }
    }
}

easylists = lists.easylists
whitelists = lists.whitelists

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to 
 * the easyLists object.
 */
function updateLists () {
    let atb = settings.getSetting('atb')
    let set_atb = settings.getSetting('set_atb')
    
    for (let listType in lists) {
        for (let name in lists[listType]) {
            let url = lists[listType][name].url

            // for now bail if we don't have a url
            if (!url) return 

            //if (atb) url = url + '&atb=' + atb
            //if (set_atb) url = url + '&set_atb=' + set_atb
            
            console.log("Checking for list update: ", name)
                
            load.loadExtensionFile({url: url, source: 'external', etag: settings.getSetting(name + '-etag')}, (listData, response) => {
                let newEtag = response.getResponseHeader('etag')
                console.log("Updating list: ", name)
                // sync new etag to storage
            
                settings.updateSetting(name + '-etag', newEtag)
                
                abp.parse(listData, lists[listType][name].parsed)
                lists[listType][name].loaded = true;
            });
        }
    }

    // Load tracker whitelist
    // trackerWhitelist declared in trackers.js
    load.loadExtensionFile({url: settings.getSetting('trackerWhitelist')}, function(listData, response) {
        console.log('loaded tracker whitelist: ' + listData);
        abp.parse(listData, trackerWhitelist);

    });
}

// Make sure the list updater runs on start up
updateLists()

function getList () {

}
chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'updateEasyLists') {
        updateLists()
    }
});

// set an alarm to recheck the lists
// update every 3 hours
chrome.alarms.create('updateEasyLists', {periodInMinutes: 180})
