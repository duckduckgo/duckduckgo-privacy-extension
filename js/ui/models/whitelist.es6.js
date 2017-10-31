const Parent = window.DDG.base.Model;

function Whitelist (attrs) {
    attrs.list = {}
    Parent.call(this, attrs)
}


Whitelist.prototype = $.extend({},
      Parent.prototype,
      {

            modelName: 'whitelist',

            removeDomain (itemIndex) {
                let domain = this.list[itemIndex];
                console.log(`whitelist: remove ${domain}`)

                this.fetch({'whitelisted': {
                    list: 'whitelisted',
                    domain: domain,
                    value: false
                }
                })
            }
      }
)

module.exports = Whitelist
