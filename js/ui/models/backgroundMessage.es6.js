const Parent = window.DDG.base.Model;

/**
 * Background messaging is done via two methods:
 *
 * 1. Passive messages from background -> backgroundMessage model -> subscribing model
 *
 *    The background sends these messages using chrome.runtime.sendMessage({'name': 'value'})
 *    The backgroundMessage model (here) receives the message and sets the value
 *    Other modules that are subscribed to state changes in backgroundMessage are notified
 *
 * 2. Two-way messaging using this.model.fetch() as a passthrough
 *
 *    Each model can use a fetch method to send and receive a response from the background. 
 *    Ex: this.model.fetch({'name': 'value'}).then((response) => console.log(response))
 *    Listeners must be registered in the background to respond to messages with this 'name'.
 *
 *    The common fetch method is defined in base/model.es6.js
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
