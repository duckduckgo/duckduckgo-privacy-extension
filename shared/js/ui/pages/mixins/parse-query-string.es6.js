module.exports = {
    parseQueryString: (qs) => {
        if (typeof qs !== 'string') {
            throw new Error('tried to parse a non-string query string')
        }

        let parsed = {}

        if (qs[0] === '?') {
            qs = qs.substr(1)
        }

        let parts = qs.split('&')

        parts.forEach((part) => {
            let [key, val] = part.split('=')

            if (key && val) {
                parsed[key] = val
            }
        })

        return parsed
    }
}
