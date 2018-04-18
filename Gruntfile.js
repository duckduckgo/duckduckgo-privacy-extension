module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt)

    grunt.initConfig({
        exec: {
            setup: 'mkdir -p data/generated'
        },
        execute: {
            entityMap: {
                src: ['scripts/entity-map.js']
            },
            tosdr: {
                src: ['scripts/tosdr.js']
            }
        }
    })

    grunt.registerTask('build', 'Build project files', ['exec:setup', 'execute:entityMap', 'execute:tosdr'])
}
