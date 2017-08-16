const Parent = window.DDG.base.Model;

function BackgroundMessage (attrs) {
    Parent.call(this, attrs);

    chrome.runtime.onMessage.addListener((req) => {
        if (req.whitelistChanged) {
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
