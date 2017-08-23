/*
 * Load the abp-filter-parser node module and 
 * pre-process the easylists.
 *
 * This will be browserifyed and turned into abp.js by running 'grunt'
 */
abp = require('abp-filter-parser');

easylists = {
    privacy: {
        url: 'https://duckduckgo.com/contentblocking.js?l=easyprivacy',
        parsed: {},
        etag: settings.getSetting('easyprivacy-etag')
    },
    general: {
        url: 'https://duckduckgo.com/contentblocking.js?l=easylist',
        parsed: {},
        etag: settings.getSetting('easylist-etag')
    }
};

/*
 * Get the list data and use abp to parse.
 * The parsed list data will be added to 
 * the easyLists object.
 */
for (let list in easylists) {
    let url = easylists[list].url;
    load.loadExtensionFile({url: url, source: 'external'}, (listData, hdrs) => {
        abp.parse(listData, easylists[list].parsed)
        easylists[list].loaded = true;
    });
}
