const Parent = window.DDG.base.Model
const tldjs = require('tldjs')

function Whitelist (attrs) {
  attrs.list = {}
  Parent.call(this, attrs)
}

Whitelist.prototype = window.$.extend({},
  Parent.prototype,
  {

    modelName: 'whitelist',

    removeDomain (itemIndex) {
      let domain = this.list[itemIndex]
      console.log(`whitelist: remove ${domain}`)

      this.fetch({'whitelisted': {
        list: 'whitelisted',
        domain: domain,
        value: false
      }
      })
    },

    addDomain: function (url) {
      // We only whitelist domains, not full URLs:
      // - use getDomain, it will return null if the URL is invalid
      // - prefix with getSubDomain, which returns an empty string if none is found
      // But first, strip the 'www.' part, otherwise getSubDomain will include it
      // and whitelisting won't work for that site
      url = url ? url.replace('www.', '') : ''
      const subDomain = tldjs.getSubdomain(url)
      const domain = tldjs.getDomain(url)
      if (domain) {
        const domainToWhitelist = subDomain ? subDomain + '.' + domain : domain
        console.log(`whitelist: add ${domainToWhitelist}`)

        this.fetch({'whitelisted':
        {
          list: 'whitelisted',
          domain: domainToWhitelist,
          value: true
        }
        })
      }

      return domain
    }
  }
)

module.exports = Whitelist
