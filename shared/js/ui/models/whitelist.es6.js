const Parent = window.DDG.base.Model
const tldjs = require('tldjs')

function Whitelist (attrs) {
    attrs.list = {}
    Parent.call(this, attrs)

    this.setWhitelistFromSettings()
}

Whitelist.prototype = window.$.extend({},
    Parent.prototype,
    {

        modelName: 'whitelist',

        removeDomain (itemIndex) {
            let domain = this.list[itemIndex]
            console.log(`whitelist: remove ${domain}`)

            this.fetch({
                'whitelisted': {
                    list: 'whitelisted',
                    domain: domain,
                    value: false
                }
            })

            // Update list
            // use splice() so it reindexes the array
            this.list.splice(itemIndex, 1)
        },

        addDomain: function (url) {
            // We only whitelist domains, not full URLs:
            // - use getDomain, it will return null if the URL is invalid
            // - prefix with getSubDomain, which returns an empty string if none is found
            // But first, strip the 'www.' part, otherwise getSubDomain will include it
            // and whitelisting won't work for that site
            url = url ? url.replace('www.', '') : ''
            const localDomain = url.match(/^localhost(:[0-9]+)?$/i) ? 'localhost' : null
            const subDomain = tldjs.getSubdomain(url)
            const domain = tldjs.getDomain(url) || localDomain
            if (domain) {
                const domainToWhitelist = subDomain ? subDomain + '.' + domain : domain
                console.log(`whitelist: add ${domainToWhitelist}`)

                this.fetch({
                    'whitelisted': {
                        list: 'whitelisted',
                        domain: domainToWhitelist,
                        value: true
                    }
                })

                this.setWhitelistFromSettings()
            }

            return domain
        },

        setWhitelistFromSettings: function () {
            let self = this
            this.fetch({getSetting: {name: 'whitelisted'}}).then((whitelist) => {
                whitelist = whitelist || {}
                let wlist = Object.keys(whitelist)
                wlist.sort()

                // Publish whitelist change notification via the store
                // used to know when to rerender the view
                self.set('list', wlist)
            })
        }
    }
)

module.exports = Whitelist
