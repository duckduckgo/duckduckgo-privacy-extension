const fs = require('fs')
const path = require('path')
const browserify = require('browserify')
const fileMapTransform = require('./browserifyFileMapTransform')

function listSourceFiles (dir) {
    return fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f))
}
const input = listSourceFiles(path.join('unit-test', 'background'))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'classes')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'events')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'reference-tests')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'storage')))
const b = browserify(input, {
    transform: [
        // fileMapTransform,
        ['babelify', {
            presets: [['@babel/preset-env', {
                exclude: [
                    'transform-regenerator'
                ]
            }]]
        }],
        ['brfs']
    ]
})

b.bundle().pipe(process.stdout)
