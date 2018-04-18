module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt)

    grunt.initConfig({
        exec: {
            setup: 'mkdir -p data/generated'
        },
        execute: {
            tosdr: {
                src: ['scripts/tosdr.js']
            }
        }
    })

    grunt.registerTask('build', 'Build project files', ['exec:setup', 'execute:tosdr'])
}
