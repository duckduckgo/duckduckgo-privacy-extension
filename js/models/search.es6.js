const Parent = window.DDG.base.Model;

function Search (attrs) {

    Parent.call(this, attrs);

};


Search.prototype = $.extend({},
  Parent.prototype,
  {

      modelType: 'search',

      doSearch: function (s) {
          this.searchText = s;
          console.log(`doSearch() for ${s}`);

            chrome.tabs.create({
              url: "https://duckduckgo.com/?q=" + s + "&bext=" + localStorage['os'] + "cr"
            });
      }

  }
);


module.exports = Search;

