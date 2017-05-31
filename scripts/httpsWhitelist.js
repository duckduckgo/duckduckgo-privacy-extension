const request = require('request'),
      parseLink = require('parse-link-header'),
      psl = require('psl'),
      fs = require('fs'),
      process = require('process');

const issuesApi = 'https://api.github.com/repos/EFForg/https-everywhere/issues';
const httpsWhitelistLoc = 'data/httpsWhitelist.json';

const token = process.env.GITHUB_API_TOKEN;

if (!token) {
    console.log("No github api token set");
    console.log("https://github.com/settings/tokens");
    console.log("export GITHUB_API_TOKEN=<your-api-token>");
    process.exit(1);
}

var options = {
    url: issuesApi,
    headers: {
        'User-Agent': 'chrome-zeroclickinfo',
        'Authorization': 'token ' + token
    }
};

var skip = ['google.cn', 'google.com', 'contributing.md'];
var skipDomains = {};
skip.map((x) => { skipDomains[x] = true });

// github issue titles
var titles = [];

// get issues for https everywhere and parse out urls from 
// the issue titles. We'll use these to build a whitelist
function getTitles(link) {

    if (!link) {
        parseTitles();
        return;
    }
    
    options.url = link.url;

    request(options, (err, res, body) => {
        if (err) {
            console.log(err);
            return;
        }

        let issues = JSON.parse(body);
        titles = titles.concat(issues.map((x) => x.title));
        let link = parseLink(res.headers.link);
        
        // use this to only test one page
        //getTitles(null);
        getTitles(link.next);

    });
}

function parseTitles() {
    let parsedTitles = {};
    
    titles.map((x) => {
        // skip titles asking to create new rules
        if (/^(create|add)/gi.exec(x)) {
            return;
        }

        //replace any invalid authority characters
        let parts = x.replace(/[^a-zA-Z0-9\.\s\:\/-]/g,'').split(' ');
        let domainToAdd = null;

        // find a valid domain somewhere in the title
        parts.some((part) => {
            if (psl.isValid(part)) {
                let domain = part.toLowerCase().replace(/^www\./,'');
                if (!skipDomains[domain]) {
                    domainToAdd = domain;
                    return;
                }
            }
        });

        if (domainToAdd)
            parsedTitles[domainToAdd] = true;
    });

    fs.writeFile(httpsWhitelistLoc, JSON.stringify(parsedTitles, null, 4),((err) => { 
                if(err){console.log(err)}
    }));

    console.log("Wrote " + Object.keys(parsedTitles).length + " HTTPS entries");
}

console.log("Building HTTPS whitelist");
getTitles(options);
