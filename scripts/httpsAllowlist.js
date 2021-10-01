const request = require('request')
const parseLink = require('parse-link-header')
const psl = require('psl')
const fs = require('fs')
const process = require('process')

const issuesApi = 'https://api.github.com/repos/EFForg/https-everywhere/issues'
const httpsAllowlistLoc = 'data/httpsAllowlist.json'

const token = process.env.GITHUB_API_TOKEN

if (!token) {
    console.log('No github api token set')
    console.log('https://github.com/settings/tokens')
    console.log('export GITHUB_API_TOKEN=<your-api-token>')
    process.exit(1)
}

const options = {
    url: issuesApi,
    headers: {
        'User-Agent': 'chrome-zeroclickinfo',
        Authorization: 'token ' + token
    }
}

const skip = ['google.cn', 'google.com', 'contributing.md']
const skipDomains = {}
skip.forEach((x) => { skipDomains[x] = true })

// github issue titles
let titles = []

// get issues for https everywhere and parse out urls from
// the issue titles. We'll use these to build a allowlist
function getTitles (link) {
    if (!link) {
        parseTitles()
        return
    }

    options.url = link.url

    request(options, (err, res, body) => {
        if (err) {
            console.log(err)
            return
        }

        const issues = JSON.parse(body)
        titles = titles.concat(issues.map((x) => x.title))
        const link = parseLink(res.headers.link)

        // use this to only test one page
        // getTitles(null);
        getTitles(link.next)
    })
}

function parseTitles () {
    const parsedTitles = {}

    titles.forEach((x) => {
        // skip titles asking to create new rules
        if (/^(create|add)/gi.exec(x)) {
            return
        }

        // replace any invalid authority characters
        const parts = x.replace(/[^a-zA-Z0-9.\s:/-]/g, '').split(' ')
        let domainToAdd = null

        // find a valid domain somewhere in the title
        parts.forEach((part) => {
            if (!domainToAdd && psl.isValid(part)) {
                const domain = part.toLowerCase().replace(/^www\./, '')
                if (!skipDomains[domain]) {
                    domainToAdd = domain
                }
            }
        })

        if (domainToAdd) { parsedTitles[domainToAdd] = true }
    })

    fs.writeFile(httpsAllowlistLoc, JSON.stringify(parsedTitles, null, 4), (err) => {
        if (err) { console.log(err) }
    })

    console.log('Wrote ' + Object.keys(parsedTitles).length + ' HTTPS entries')
}

console.log('Building HTTPS allowlist')
getTitles(options)
