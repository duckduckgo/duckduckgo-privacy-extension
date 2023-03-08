const fs = require('fs')
const path = require('path')
const browserify = require('browserify')
const fileMapTransform = require('./browserifyFileMapTransform')

const outputFile = process.argv[2]

function listSourceFiles (dir) {
    return fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f))
}
const input = listSourceFiles(path.join('unit-test', 'background'))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'classes')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'events')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'reference-tests')))
    .concat(listSourceFiles(path.join('unit-test', 'background', 'storage')))
browserify(input, {
    transform: [
        fileMapTransform,
        ['babelify', {
            presets: [['@babel/preset-env', {
                exclude: [
                    'transform-regenerator'
                ]
            }]]
        }],
        ['brfs']
    ]
}).bundle((err, bundle) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    fs.writeFileSync(outputFile, bundle)
})
