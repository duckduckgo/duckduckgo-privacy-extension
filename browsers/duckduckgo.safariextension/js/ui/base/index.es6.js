require('./../../../../../shared/js/ui/base/index.es6.js')
window.DDG.base.Model.prototype.fetch = function(message) {
       return new Promise( (resolve, reject) => {
           console.log(`Safari Fetch: ${JSON.stringify(message)}`)
           // adapt message for safari
           if (message.getCurrentTab) {
               resolve(safari.extension.globalPage.contentWindow.tabManager.getActiveTab())
           }
           else if (message.getTopBlocked) {
               resolve(safari.extension.globalPage.contentWindow.Companies.getTopBlocked(message.getTopBlocked))
           }
           else if (message.getBrowser) {
               resolve('safari')
           }
           else if (message.whitelisted) {
               if (message.context && message.context === 'options') {
                   resolve(safari.self.tab.dispatchMessage('whitelisted', message))
               }else {
                   resolve(safari.extension.globalPage.contentWindow.tabManager.whitelistDomain(message.whitelisted))
               }
           }
           else if (message.getSiteScore) {
               let tab = safari.extension.globalPage.contentWindow.tabManager.get({tabId: message.getSiteScore})
               if (tab) resolve(tab.site.score.get())
           }
           else if (message.getSetting) {
               if (message.context && message.context === 'options') {
                   // send message with time stamp
                   let timestamp = Date.now()
                   message.timestamp = timestamp
                   safari.self.tab.dispatchMessage('getSetting', message)

                   safari.self.addEventListener('message', (e) => {
                       if (e.name === 'getSetting' && e.message.timestamp === timestamp) {
                           delete e.message.timestamp
                           resolve(e.message)
                       }
                   }, false);
               }
           }
           else if (message.updateSetting) {
               if (message.context && message.context === 'options') {
                   resolve(safari.self.tab.dispatchMessage('updateSetting', message))
               }
           }
           else if (message.getTopBlockedByPages) {
               resolve(safari.extension.globalPage.contentWindow.Companies.getTopBlockedByPages(message.getTopBlockedByPages))
           }
       })
}
