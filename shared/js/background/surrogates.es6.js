/****
 *
 */

let surrogateList = {}

class Surrogates {
    /****
     * Takes a text response, in uBlock's resources.txt format:
     * https://github.com/uBlockOrigin/uAssets/blob/master/filters/resources.txt
     *
     * Parses it into surrogateList hash, with the rules as keys
     * and the base64 encoded surrogate content as the value.
     */
    parse (text, res) {
        const b64dataheader = 'data:application/javascript;base64,'
        res = res || {}

        this.trackersSurrogateList = text.trim().split('\n\n')

        for (let sur of this.trackersSurrogateList) {
            // remove comment lines that begin with #
            let lines = sur.split('\n').filter((line) => {
                return !(/^#.*/).test(line)
            })
            // remove first line, store it
            let firstLine = lines.shift()
            // take identifier from first line
            let pattern = firstLine.split(' ')[0]
            let b64surrogate = btoa(lines.join('\n'))
            res[pattern] = b64dataheader + b64surrogate
        }
        surrogateList = res
        return res
    }

    hasList () {
        return Object.keys(surrogateList).length
    }

    getContentForRule (rule) {
        return surrogateList[rule]
    }

    /****
     * Takes a full url, along with a tldjs parsed url object, and the full
     * parsed list of rules, returning surrogate content if there is some available
     * for the given url.
     */
    getContentForUrl (url, parsedUrl) {
        // The rules we're loading in from ublock look like:
        // googletagservices.com/gpt.js
        //
        // Anything not specific in the rule is intended to be a wildcard, including the paths.
        //
        // So that rule can match things like:
        // https://wwww.googletagservices.com/js/gpt.js
        // or
        // http://en.www.googletagservices.com/some/other/random/path/gpt.js?v=123
        //
        // All our rules have domain + filename, so for now we're safe making that assumption.
        let splitUrl = url.split('/')
        // pull everything after the last slash as the filename:
        let filename = splitUrl[splitUrl.length - 1]
        // strip off any querystring params:
        filename = filename.split('?')[0]
        // concat with domain to match the original rule:
        let ruleToMatch = parsedUrl.domain + '/' + filename
        return surrogateList[ruleToMatch]
    }
}

module.exports = new Surrogates()
