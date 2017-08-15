const Parent = window.DDG.base.Model;

function BackgroundMessage (attrs) {
    Parent.call(this, attrs);

    this.bindEvents([
            [this.store.subscribe, 'change:site', this._siteChanged]
    ])
}

BackgroundMessage.prototype = $.extend({}, 
    Parent.prototype,
    {
        modelName: 'backgroundMessage',

        _siteChanged: function(message) {
            if (message.change && message.change.attribute === 'whitelisted') {
                this.fetch({'whitelisted': message.change.value});
            }
        }
    }
);

module.exports = BackgroundMessage;
