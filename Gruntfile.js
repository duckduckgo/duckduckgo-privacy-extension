module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt)

    grunt.initConfig({
        exec: {
            setup: 'mkdir -p data/generated'
        },
        execute: {
            entityMap: {
                src: ['data-scripts/entity-map.js']
            },
            trackersWithParentCompany: {
                src: ['data-scripts/trackers-with-parent-company.js']
            },
            tosdr: {
                src: ['data-scripts/tosdr.js']
            }
        }
    })

    grunt.registerTask('updateLists', 'Update data lists used by the grade calculation', [
        'exec:setup',
        'execute:entityMap',
        'execute:tosdr',
        'execute:trackersWithParentCompany'
    ])
}
