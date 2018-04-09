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
      
      let url = 'https://duckduckgo.com/?q=' + s

      if (window.chrome) {
          window.chrome.tabs.create({
              url: `${url}&bext=${window.localStorage['os']}cr`
          })
      } else {
          safari.application.activeBrowserWindow.openTab().url = `${url}&bext=safari`
          safari.self.hide()
      }
    }

  }
)

module.exports = Search
