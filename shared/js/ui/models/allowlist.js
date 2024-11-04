const Parent = window.DDG.base.Model
const tldts = require('tldts')

function Allowlist(attrs) {
    attrs.list = {}
    Parent.call(this, attrs)

    this.setAllowlistFromSettings()
}

Allowlist.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'allowlist',

    removeDomain(itemIndex) {
        const domain = this.list[itemIndex]
        console.log(`allowlist: remove ${domain}`)

        this.sendMessage('setList', {
            list: 'allowlisted',
            domain,
            value: false,
        })
        // Remove domain allowlist opt-in status, if present
        this.sendMessage('allowlistOptIn', {
            list: 'allowlistOptIn',
            domain,
            value: false,
        })

        // Update list
        // use splice() so it reindexes the array
        this.list.splice(itemIndex, 1)
    },

    addDomain: function (url) {
        // We only allowlist domains, not full URLs:
        // - use getDomain, it will return null if the URL is invalid
        // - prefix with getSubDomain, which returns an empty string if none is found
        // But first, strip the 'www.' part, otherwise getSubDomain will include it
        // and allowlisting won't work for that site
        url = url ? url.replace(/^www\./, '') : ''
        const parsedDomain = tldts.parse(url)
        const localDomain = url.match(/^localhost(:[0-9]+)?$/i) ? 'localhost' : null
        const subDomain = parsedDomain.subdomain
        const domain = localDomain || (parsedDomain.isIp ? parsedDomain.hostname : parsedDomain.domain)
        if (domain) {
            const domainToAllowlist = subDomain ? subDomain + '.' + domain : domain
            console.log(`allowlist: add ${domainToAllowlist}`)

            this.sendMessage('setList', {
                list: 'allowlisted',
                domain: domainToAllowlist,
                value: true,
            })

            this.setAllowlistFromSettings()
        }

        return domain
    },

    setAllowlistFromSettings: function () {
        const self = this
        this.sendMessage('getSetting', { name: 'allowlisted' }).then((allowlist) => {
            allowlist = allowlist || {}
            const wlist = Object.keys(allowlist)
            wlist.sort()

            // Publish allowlist change notification via the store
            // used to know when to rerender the view
            self.set('list', wlist)
        })
    },
})

module.exports = Allowlist
