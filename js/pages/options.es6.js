const Parent = window.DDG.base.Page;

const PrivacyOptionsView = require('./../views/privacyOptions.es6.js');
const PrivacyOptionsModel = require('./../models/privacyOptions.es6.js');
const PrivacyOptionsTemplate = require('./../templates/privacyOptions.es6.js');

const WhitelistView = require('./../views/whitelist.es6.js');
const WhitelistModel = require('./../models/whitelist.es6.js');
const WhitelistTemplate = require('./../templates/whitelist.es6.js');

function Options (ops) {
    Parent.call(this, ops);
};

Options.prototype = $.extend({},
    Parent.prototype,
    {

        pageType: 'options',

        ready: function() {

            var $parent = $("#ddg-options-content");

            Parent.prototype.ready.call(this);

            this.views.options = new PrivacyOptionsView({
                pageView: this,
                model: new PrivacyOptionsModel({}),
                appendTo: $parent,
                template: PrivacyOptionsTemplate
            });

            this.views.whitelist = new WhitelistView({
                pageView: this,
                model: new WhitelistModel({}),
                appendTo: $parent,
                template: WhitelistTemplate
            });

        }

    }
);


// kickoff!
window.DDG = window.DDG || {};
window.DDG.page = new Options();
 

