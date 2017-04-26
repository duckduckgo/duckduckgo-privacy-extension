function BasePage (ops) {
    this.views = {};
    this.ready();
};

BasePage.prototype = {

    // pageType: '' - should be defined by each page subclass

    ready: function() {
      debugger;
    }

};

module.exports = BasePage;
