const Parent = window.DDG.base.Model;

function Whitelist (attrs) {
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

            this.set('whitelisted',{
                list: 'whitelisted',
                domain: domain,
                value: false
            });
        }
  }
);

module.exports = Whitelist;
