(function() {

/****
 * 
 */

let surrogateList = {}

class Surrogates {

    /****
     * Takes a text response, in uBlock's resources.txt format:
     * https://github.com/uBlockOrigin/uAssets/blob/master/filters/resources.txt
     *
     * Based off of their parser:
     * https://github.com/gorhill/uBlock/blob/master/src/js/redirect-engine.js#L400
     *
     * Parses it into surrogateList hash, with the rules as keys
     * and the base64 encoded surrogate content as the value.
     */
    parse (text, res) {
        res = res || {}

        this.text = text
        this.textLen = this.text.length
        this.offset = 0

        var line,
            fields,
            encoded,
            reNonEmptyLine = /\S/

        while ( this.eot() === false ) {
            line = this.nextLine()
            if (line.startsWith('#')) { continue; }

            if (fields === undefined) {
                fields = line.trim().split(/\s+/)
                if ( fields.length === 2 ) {
                    encoded = fields[1].indexOf(';') !== -1
                } else {
                    fields = undefined
                }
                continue;
            }

            if (reNonEmptyLine.test(line)) {
                fields.push(encoded ? line.trim() : line);
                continue;
            }

            res[fields[0]] = this.getRedirectURL(fields[1], fields.slice(2))

            fields = undefined
        }

        surrogateList = res
        return res
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
        // According to what I saw in their github issues, anything not
        // specific in the rule is intended to be a wildcard, including the paths.
        //
        // So that rule can match things like:
        // https://wwww.googletagservices.com/js/gpt.js
        // or
        // http://en.www.googletagservices.com/some/other/random/path/gpt.js?v=123
        //
        // All our rules have domain + filename, so for now we're safe making that assumption.
        let splitUrl = url.split('/')
        let filename = splitUrl[splitUrl.length - 1]
        let ruleToMatch = parsedUrl.domain + '/' + filename
        return surrogateList[ruleToMatch]
    }


    // parse() sub-functions from uBlock for parsing the file:

    // https://github.com/gorhill/uBlock/blob/a9f68fe02f40472c3e16287f8a67b0abe9421e10/src/js/utils.js#L163
    nextLine (offset) {
        if (offset !== undefined) {
            this.offset += offset
        }
        var lineEnd = this.text.indexOf('\n', this.offset)
        if ( lineEnd === -1 ) {
            lineEnd = this.text.indexOf('\r', this.offset)
            if ( lineEnd === -1 ) {
                lineEnd = this.textLen
            }
        }
        var line = this.text.slice(this.offset, lineEnd)
        this.offset = lineEnd + 1
        return line
    }

    charCodeAt (offset) {
        return this.text.charCodeAt(this.offset + offset)
    }

    eot () {
        return this.offset >= this.textLen
    }

    getRedirectURL (mime, lines) {
        // https://github.com/gorhill/uBlock/blob/master/src/js/redirect-engine.js#L65
        var data = lines.join(mime.indexOf(';') !== -1 ? '' : '\n')

        // https://github.com/gorhill/uBlock/blob/master/src/js/redirect-engine.js#L38
        if (data.startsWith('data:') === false ) {
            if (mime.indexOf(';') === -1 ) {
                data = 'data:' + mime + ';base64,' + btoa(data)
            } else {
                data = 'data:' + mime + ',' + data
            }
        }

        return data
    }
}

require.scopes.surrogates = new Surrogates()
})()
