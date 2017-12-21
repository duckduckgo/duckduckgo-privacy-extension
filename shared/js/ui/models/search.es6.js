const Parent = window.DDG.base.Model

function Search (attrs) {
  Parent.call(this, attrs)
}

Search.prototype = window.$.extend({},
  Parent.prototype,
  {

    modelName: 'search',

    doSearch: function (s) {
      this.searchText = s
      s = encodeURIComponent(s)

      console.log(`doSearch() for ${s}`)

      window.chrome.tabs.create({
        url: 'https://duckduckgo.com/?q=' + s + '&bext=' + window.localStorage['os'] + 'cr'
      })
    }

  }
)

module.exports = Search
