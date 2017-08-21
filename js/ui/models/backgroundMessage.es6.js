const Parent = window.DDG.base.Model;

/**
 * Listen for messages from background and set the change
 * to notify subscribers. this.set(<name>, <value>)
 */
function BackgroundMessage (attrs) {
    Parent.call(this, attrs);

    // listen for messages from background 
    chrome.runtime.onMessage.addListener((req) => {
        if (req.whitelistChanged) {
            // notify subscribers that the whitelist has changed
            this.set('whitelistChanged', true)
        }
    });
}

BackgroundMessage.prototype = $.extend({}, 
    Parent.prototype,
    {
        modelName: 'backgroundMessage',
    }
);

module.exports = BackgroundMessage;
