const Parent = window.DDG.base.Model;

function Message (attrs) {
    Parent.call(this, attrs);

    this.bindEvents([
            [this.store.subscribe, 'change:site', this._siteChanged]
    ])
}

Message.prototype = $.extend({}, 
    Parent.prototype,
    {
        modelName: 'message',

        _siteChanged: function(message) {
            if (message.change && message.change.attribute === 'whitelisted') {
                console.log("Send a message to update whitelist: ", message.change.attribute)
            }
        }
    }
);

module.exports = Message;
