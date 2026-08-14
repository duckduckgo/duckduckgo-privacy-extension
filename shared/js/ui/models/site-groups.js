const Parent = window.DDG.base.Model;

function SiteGroups(attrs) {
    attrs.groups = [];
    Parent.call(this, attrs);
    this.load();
}

SiteGroups.prototype = window.$.extend({}, Parent.prototype, {
    modelName: 'siteGroups',

    load() {
        return this.sendMessage('getSiteGroupsState').then((state) => {
            this.set('groups', state?.groups || []);
            return this.groups;
        });
    },

    create() {
        return this.sendMessage('createSiteGroup').then((state) => {
            this.set('groups', state?.groups || []);
            return state;
        });
    },

    updateGroup(id, { name, maxSecondsPerDay }) {
        return this.sendMessage('updateSiteGroup', { id, name, maxSecondsPerDay }).then((state) => {
            this.set('groups', state?.groups || []);
            return state;
        });
    },

    deleteGroup(id) {
        return this.sendMessage('deleteSiteGroup', { id }).then((state) => {
            this.set('groups', state?.groups || []);
            return state;
        });
    },

    addDomain(groupId, domain) {
        return this.sendMessage('addSiteToGroup', { groupId, domain }).then((state) => {
            this.set('groups', state?.groups || []);
            return state;
        });
    },

    removeDomain(groupId, domain) {
        return this.sendMessage('removeSiteFromGroup', { groupId, domain }).then((state) => {
            this.set('groups', state?.groups || []);
            return state;
        });
    },
});

module.exports = SiteGroups;
