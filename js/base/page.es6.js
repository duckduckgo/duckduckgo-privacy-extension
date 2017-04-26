function BasePage (ops) {
    this.views = {};
    env.ready(this.ready.bind(this));
};

BasePage.prototype = {

    // pageType: '' - should be defined by each page subclass

    ready: function() {

    }

};

module.exports = BasePage;
