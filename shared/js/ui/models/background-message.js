const Parent = window.DDG.base.Model;
const browserUIWrapper = require('./../base/ui-wrapper.js');

/**
 * Background messaging is done via two methods:
 *
 * 1. Passive messages from background -> backgroundMessage model -> subscribing model
 *
 *  The background sends these messages using chrome.runtime.sendMessage({'name': 'value'})
 *  The backgroundMessage model (here) receives the message and forwards the
 *  it to the global event store via model.send(msg)
 *  Other modules that are subscribed to state changes in backgroundMessage are notified
 *
 * 2. Two-way messaging using this.model.sendMessage() as a passthrough
 *
 *  Each model can use a sendMessage method to send and receive a response from the background.
 *  Ex: this.model.sendMessage('name', { ... }).then((response) => console.log(response))
 *  Listeners must be registered in the background to respond to messages with this 'name'.
 *
 *  The common sendMessage method is defined in base/model.js
 */
function BackgroundMessage(attrs) {
    Parent.call(this, attrs);
    const thisModel = this;
    browserUIWrapper.backgroundMessage(thisModel);
}

BackgroundMessage.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'backgroundMessage',
});

module.exports = BackgroundMessage;
