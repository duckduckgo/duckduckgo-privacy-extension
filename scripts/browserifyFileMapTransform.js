/**
 * This transform detects patterns in files matching "FILE_MAP /path/to/files/with/wildcard/config*.json" pattern
 * and injects a map with all matching files e.g.
 * "config1.json": require('/path/to/files/with/wildcard/config1.json"),
 * "config2.json": require('/path/to/files/with/wildcard/config2.json"),
 */
const through = require('through2')
const glob = require('glob')
const path = require('path')

module.exports = function (file) {
    return through(function (chunk, enc, callback) {
        const string = chunk.toString('utf8')
        const matches = string.match(/\/\/ FILE_MAP (?<path>.*)\n/)

        if (matches) {
            console.log('FILE_MAP transform replacement for path', matches.groups.path, 'in file', file)
            const files = glob.sync(matches.groups.path, { cwd: path.dirname(file) })
            const output = files
                .map(matchPath => `'${path.basename(matchPath)}': require('${matchPath}')`)
                .join(',\n')

            this.push(string.substring(0, matches.index) + output + string.substring(matches.index))
        } else {
            this.push(chunk)
        }
        callback()
    })
}
