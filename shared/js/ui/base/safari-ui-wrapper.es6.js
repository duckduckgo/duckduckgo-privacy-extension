let fetch = ((message) => {
   return new Promise( (resolve, reject) => {
       console.log(`Safari Fetch: ${JSON.stringify(message)}`)
       if (message.getCurrentTab || message.getTab) {
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
               // send message random ID so we know which promise to resolve
               let id = Math.random()
               message.id = id
               safari.self.tab.dispatchMessage('getSetting', message)
               
               safari.self.addEventListener('message', (e) => {
                   if (e.name === 'getSetting' && e.message.id === id) {
                       delete e.message.id
                       resolve(e.message)
                   }
               }, true);
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
       else if (message.resetTrackersData) {
          safari.extension.globalPage.contentWindow.Companies.resetData()          
          safari.self.hide()
      }
   })
})

let backgroundMessage = (() => {
    // listen for messages from background 
    safari.self.addEventListener("message", (req) => {
        if (req.whitelistChanged) {
            // notify subscribers that the whitelist has changed
            this.set('whitelistChanged', true)
        }
        else if (req.updateTrackerCount) {
            this.set('updateTrackerCount', true)
        }
    })
})

let getBackgroundTabData = ((thisModel) => {
    return new Promise ((resolve) => {
        let tab = safari.extension.globalPage.contentWindow.tabManager.getActiveTab()
        
        if (tab) {
            let tabCopy = JSON.parse(JSON.stringify(tab))
            resolve(tabCopy)
        } else {
            resolve()
        }
    })
})

let createBrowserTab = ((url) => {
    safari.application.activeBrowserWindow.openTab().url = `${url}&bext=safari`
    safari.self.hide()
})

let getExtensionURL = ((path) => {
    return safari.extension.baseURI + path
})

let openOptionsPage = (() => {
    let tab = safari.application.activeBrowserWindow.openTab()
    tab.url = getExtensionURL('html/options.html')
    safari.self.hide()
})

let getExtensionVersion = (() => {
    return safari.extension.displayVersion
})

module.exports = {
    fetch: fetch,
    backgroundMessage: backgroundMessage,
    getBackgroundTabData: getBackgroundTabData,
    createBrowserTab: createBrowserTab,
    openOptionsPage: openOptionsPage,
    getExtensionURL: getExtensionURL,
    getExtensionVersion: getExtensionVersion
}
