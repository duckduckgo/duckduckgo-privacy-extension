const Parent = window.DDG.base.Page
const mixins = require('./mixins/index.es6.js')
const HamburgerMenuView = require('./../views/hamburger-menu.es6.js')
const HamburgerMenuModel = require('./../models/hamburger-menu.es6.js')
const hamburgerMenuTemplate = require('./../templates/hamburger-menu.es6.js')
const TopBlockedView = require('./../views/top-blocked-truncated.es6.js')
const TopBlockedModel = require('./../models/top-blocked.es6.js')
const topBlockedTemplate = require('./../templates/top-blocked-truncated.es6.js')
const SiteView = require('./../views/site.es6.js')
const SiteModel = require('./../models/site.es6.js')
const siteTemplate = require('./../templates/site.es6.js')
const SearchView = require('./../views/search.es6.js')
const SearchModel = require('./../models/search.es6.js')
const UpdateMessageView = require('./../views/updated-message.es6.js')
const UpdateMessageModel = require('./../models/updated-message.es6.js')
const updateMessageTemplate = require('./../templates/updated-message.es6.js')
const searchTemplate = require('./../templates/search.es6.js')
const AutocompleteView = require('./../views/autocomplete.es6.js')
const AutocompleteModel = require('./../models/autocomplete.es6.js')
const autocompleteTemplate = require('./../templates/autocomplete.es6.js')
const BackgroundMessageModel = require('./../models/background-message.es6.js')

function Trackers (ops) {
    this.$parent = window.$('#popup-container')
    Parent.call(this, ops)
}

Trackers.prototype = window.$.extend({},
    Parent.prototype,
    mixins.setBrowserClassOnBodyTag,
    {

        pageName: 'popup',

        ready: function () {
            Parent.prototype.ready.call(this)
            this.message = new BackgroundMessageModel()
            this.setBrowserClassOnBodyTag()

            this.views.search = new SearchView({
                pageView: this,
                model: new SearchModel({searchText: ''}),
                appendTo: this.$parent,
                template: searchTemplate
            })

            // show updated message in popup only on first click after update
            // 'seenIcon' tells us that the popup is being created from a user click
            // on the icon and not from a rerender. We set a flag to avoid seeing this 
            // message again.
            if (safari.extension.globalPage.contentWindow.localStorage['seenIcon']) {
                if (!safari.extension.globalPage.contentWindow.localStorage['closedUpdateMessage']) {
                    this.views.updateMessage = new UpdateMessageView({
                        pageView: this, 
                        model: new UpdateMessageModel(),
                        appendTo: this.$parent,
                        template: updateMessageTemplate
                    })
                }
            }
        }
    }
)

// kickoff!
window.DDG = window.DDG || {}
window.DDG.page = new Trackers()
