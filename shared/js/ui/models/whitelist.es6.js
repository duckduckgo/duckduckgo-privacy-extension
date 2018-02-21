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
      const parsedUrl = tldjs.tldExists(url) ? tldjs.parse(url) : ''
      let isValidUrl = false
      if (parsedUrl && parsedUrl.hostname) {
        const hostname = parsedUrl.hostname
        console.log(`whitelist: add ${hostname}`)

        isValidUrl = true

        this.fetch({'whitelisted':
        {
          list: 'whitelisted',
          domain: hostname,
          value: true
        }
        })
      }

      return isValidUrl
    }
  }
)

module.exports = Whitelist
