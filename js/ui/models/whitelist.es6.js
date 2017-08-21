const Parent = window.DDG.base.Model;

function Whitelist (attrs) {
    // placeholder until we get whitelist data from background
    this.list = {}

    Parent.call(this, attrs);
};


Whitelist.prototype = $.extend({},
  Parent.prototype,
  {

        modelName: 'whitelist',


        removeDomain(itemIndex) {
            var domain = this.list[itemIndex];
            console.log(`whitelist: remove ${domain}`);

            this.fetch({'whitelisted': 
                {
                list: 'whitelisted',
                domain: domain,
                value: false
                }
            });
        }
  }
);

module.exports = Whitelist;
