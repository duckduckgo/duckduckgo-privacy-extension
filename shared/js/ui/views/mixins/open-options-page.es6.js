module.exports = {
  openOptionsPage: function () {
    this.model.fetch({getBrowser: true}).then(browser => {
      if (browser === 'moz') {
        window.chrome.tabs.create({url: window.chrome.extension.getURL('/html/options.html')})
        window.close()
      } else {
        window.chrome.runtime.openOptionsPage()
      }
    })
  }
}
