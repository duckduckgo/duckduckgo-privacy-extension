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
      // we only whitelist domains, not full URLs
      // and getDomain will return null if the URL is invalid
      const domain = tldjs.getDomain(url)
      if (domain) {
        console.log(`whitelist: add ${domain}`)

        this.fetch({'whitelisted':
        {
          list: 'whitelisted',
          domain: domain,
          value: true
        }
        })
      }

      return domain
    }
  }
)

module.exports = Whitelist
