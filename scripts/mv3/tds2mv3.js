const tdsURL = 'https://staticcdn.duckduckgo.com/trackerblocking/tds.json'

const https = require('https')
const fs = require('fs')

const mv3ResourceTypes = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']

function transformRegex (regex) {
    return regex.replace(/\\\//g, '/').replace(/\\\./g, '.').replace(/\.\*/g, '*')
}

function transformType (tdsType) {
    if (tdsType === 'subdocument') {
        return 'sub_frame'
    } else if (mv3ResourceTypes.includes(tdsType)) {
        return tdsType
    }

    throw new Error(`Unknown exception.type: ${tdsType}`)
}

function transformResourceRule (inputRule, id) {
    const rule = {
        id
    }

    rule.condition = {
        urlFilter: `||${transformRegex(inputRule.rule)}`,
        isUrlFilterCaseSensitive: false,
        excludedResourceTypes: ['main_frame'],
        domainType: 'thirdParty'
    }

    if (inputRule.action === 'ignore') {
        rule.action = {type: 'allow'}
    } else {
        rule.action = {type: 'block'}
    }

    if (inputRule.exceptions) {
        if (inputRule.exceptions.domains && inputRule.exceptions.domains.length) {
            rule.condition.excludedDomains = inputRule.exceptions.domains
        }

        if (inputRule.exceptions.types && inputRule.exceptions.types.length) {
            rule.condition.resourceTypes = inputRule.exceptions.types.map(transformType)
        }
    }

    return rule
}

function transform (tds) {
    const rules = []
    const stats = {
        allRules: 0,
        blockRules: 0,
        ignoreRules: 0,
        surrogates: 0
    }
    let ruleId = 1

    Object.values(tds.trackers).forEach(tracker => {
        stats.allRules++
        const rule = {
            id: ruleId++
        }
        const owner = tracker.owner && tracker.owner.name && tds.entities[tracker.owner.name]
        const ownerOtherDomains = owner && owner.domains && owner.domains.filter(domain => domain !== tracker.domain)

        if (tracker.default === 'block') {
            stats.blockRules++
            rule.condition = {
                urlFilter: `||${tracker.domain}`,
                isUrlFilterCaseSensitive: false,
                excludedResourceTypes: ['main_frame'],
                domainType: 'thirdParty'
            }
            rule.action = {type: 'block'}

            if (ownerOtherDomains && ownerOtherDomains.length) {
                rule.condition.excludedDomains = ownerOtherDomains
            }

            rules.push(rule)
        } else if (tracker.default === 'ignore') {
            stats.ignoreRules++
        } else {
            throw new Error(`Unknown tracker.default: ${tracker.default}`)
        }

        if (tracker.rules && tracker.rules.length) {
            // ignore rules
            tracker.rules.forEach(resourceRule => {
                stats.allRules++

                if (resourceRule.surrogate) {
                    stats.surrogates++
                    return // TODO
                }

                if (resourceRule.action === 'ignore') {
                    stats.ignoreRules++
                } else {
                    stats.blockRules++
                }

                rules.push(transformResourceRule(resourceRule, ruleId++))
            })
        }
    })

    fs.writeFileSync('./rules.json', JSON.stringify(rules, null, 2))

    console.log('Done.', stats)
}

// fetching a file in NodeJS 🙄
https.get(tdsURL, res => {
    const { statusCode } = res
    const contentType = res.headers['content-type']

    let error
    if (statusCode !== 200) {
        error = new Error(`Request Failed.\n Status Code: ${statusCode}`)
    } else if (!/^application\/json/.test(contentType) && !/^text\/plain/.test(contentType)) {
        error = new Error(`Invalid content-type.\n Expected application/json but received ${contentType}`)
    }
    if (error) {
        console.error(error.message)
        res.resume()
        return
    }

    res.setEncoding('utf8')
    let rawData = ''
    res.on('data', (chunk) => { rawData += chunk })
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData)
            transform(parsedData)
        } catch (e) {
            console.error(e.message)
        }
    })
})
