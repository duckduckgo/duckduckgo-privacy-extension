module.exports = (grunt) => {
    require('load-grunt-tasks')(grunt)

    let karmaOps = {
        configFile: 'karma.conf.js',
        basePath: 'build/',
        files: ['test.js']
    }

    // override some options to allow the devs
    // to open the test page manually and debug
    if (grunt.option('test-debug')) {
        Object.assign(karmaOps, {
            // don't kill the process when first test is run
            singleRun: false,
            // INFO outputs the url/port for the test page
            logLevel: 'INFO',
            // don't run headless chrome tests
            browsers: []
        })
    }

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
            },
            polisis: {
                src: ['data-scripts/polisis.js']
            }
        },
        browserify: {
            options: {
                browserifyOptions: {
                    debug: true
                }
            },
            test: {
                files: {
                    'build/test.js': ['test/**/*.js']
                }
            }
        },
        karma: {
            unit: {
                options: karmaOps
            }
        }
    })

    grunt.registerTask('updateLists', 'Update data lists used by the grade calculation', [
        'exec:setup',
        'execute:entityMap',
        'execute:tosdr',
        'execute:polisis',
        'execute:trackersWithParentCompany'
    ])
    // NOTE: why is browserify being used for the extension?
    // 1. it's the setup we use for the extension, less difference in config
    // 2. this code will, in the vast majority of cases, be used in a browser context
    // 3. easier to use browser devtools to debug
    grunt.registerTask('test','Build and run tests', ['browserify:test','karma'])
}
