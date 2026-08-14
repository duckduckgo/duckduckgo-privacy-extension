const Parent = window.DDG.base.Model;

function BlockedSites(attrs) {
    attrs.domains = [];
    Parent.call(this, attrs);
    this.load();
}

BlockedSites.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'blockedSites',

    load() {
        return this.sendMessage('getBlockedSites').then((domains) => {
            this.set('domains', domains || []);
            return this.domains;
        });
    },

    save(text) {
        return this.sendMessage('setBlockedSites', { text }).then((result) => {
            if (result?.saved) {
                this.set('domains', result.domains);
            }
            return result;
        });
    },
});

module.exports = BlockedSites;
