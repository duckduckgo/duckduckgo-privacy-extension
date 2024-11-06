const mixins = require('./mixins/index.js');
const store = require('./store.js');

function BasePage(ops) {
    this.views = {};
    this.store = store;
    this.ready();
}

BasePage.prototype = window.$.extend({}, mixins.events, {
    // pageName: '' - should be unique, defined by each page subclass

    ready: function () {},
});

module.exports = BasePage;
