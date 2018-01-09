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
      safari.application.activeBrowserWindow.openTab().url = 'https://duckduckgo.com/?q=' + s + '&bext=safari'
      safari.extension.popovers[0].hide()
    }

  }
)

module.exports = Search
