const browserWrapper = require('./../../../background/$BROWSER-wrapper.es6')

module.exports = {
  openOptionsPage: function () {
    this.model.fetch({getBrowser: true}).then(browser => {
      if (browser === 'moz') {
        window.chrome.tabs.create({url: window.chrome.extension.getURL('/html/options.html')})
        window.close()
      } 
      else if (browser === 'chrome') {
        window.chrome.runtime.openOptionsPage()
      }
      else if (browser === 'safari') {
          let tab = safari.application.activeBrowserWindow.openTab()
          tab.url = browserWrapper.getExtensionURL('html/options.html')
          // close the popup
          safari.self.hide()
      }
    })
  }
}
