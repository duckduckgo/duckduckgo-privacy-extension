let dynamicDomains = []

// load all dynamic rules into memory for easy acces on init
chrome.declarativeNetRequest.getDynamicRules(rules => {
    dynamicDomains = rules.map(rule => rule.condition.urlFilter.replace(/^\|\|/, ''))
    console.log('Dynamic rules loaded:', dynamicDomains)
})

function addToHTTPSafelist (url) {
    let ruleCreated, ruleNotCreated
    const promise = new Promise((resolve, reject) => { ruleCreated = resolve; ruleNotCreated = reject })

    if (dynamicDomains.includes(url.hostname)) {
        console.log('hostname is alrady safelisted:', dynamicDomains)
        ruleCreated()
        return promise
    }

    const newException = {
        id: dynamicDomains.length + 1,
        priority: 2, // default upgrade-all rule has priority 1
        action: {
            type: 'allow'
        },
        condition: {
            urlFilter: `||${url.hostname}`,
            resourceTypes: ['main_frame']
        }
    }

    console.log('adding new exception', newException)
    chrome.declarativeNetRequest.updateDynamicRules([], [newException], () => {
        if (chrome.runtime.lastError) {
            console.error('Error creating a rule', chrome.runtime.lastError)
            ruleNotCreated()
            return
        }

        dynamicDomains.push(url.hostname)
        ruleCreated()
    })

    return promise
}

function clearDynamicRules () {
    chrome.declarativeNetRequest.getDynamicRules(rules => {
        console.log('Remove existing dynamic rules:', rules.length)
        chrome.declarativeNetRequest.updateDynamicRules(rules.map(r => r.id), [], () => {
            dynamicDomains = []
        })
    })
}

exports.addToHTTPSafelist = addToHTTPSafelist
exports.clearDynamicRules = clearDynamicRules
