const Parent = window.DDG.base.Model

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

    addDomain: function (domain) {
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
    }
  }
)

module.exports = Whitelist
