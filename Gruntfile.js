module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
    grunt.loadNpmTasks('grunt-karma')

    var values = require('object.values');

    if(!Object.values) {
        values.shim()
    }

    let browser = grunt.option('browser')
    let buildType = grunt.option('type')
    let buildPath = `build/${browser}/${buildType}`

    if(!(browser && buildType)) {
        console.error("Missing browser or  build type: --browser=<browser-name> --type=<dev,release>")
        process.exit(1)
    }

    /* These are files common to all browsers. To add or override any of these files
     * see the browserMap object below */
    let baseFileMap = {
        ui: {
            '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/index.es6.js'],
            '<%= dirs.public.js %>/popup.js': ['<%= dirs.src.js %>/ui/pages/popup.es6.js'],
            '<%= dirs.public.js %>/options.js': ['<%= dirs.src.js %>/ui/pages/options.es6.js']
        },
        background: {
            '<%= dirs.public.js %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js']
        },
        backgroundTest: {
            '<%= dirs.test %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js', '<%= dirs.test %>/requireHelper.js']
        },
        unitTest: {
            '<%= dirs.unitTest.build %>/background.js': ['<%= dirs.unitTest.background %>/**/*.js'],
            // TODO uncomment this when we add some UI tests
            // '<%= dirs.unitTest.build %>/ui.js': ['<%= dirs.unitTest.ui %>/**/*.js']
        },
        sass: {
            '<%= dirs.public.css %>/noatb.css': ['<%= dirs.src.scss %>/noatb.scss'],
            '<%= dirs.public.css %>/base.css': ['<%= dirs.src.scss %>/base/base.scss'],
            '<%= dirs.public.css %>/popup.css': ['<%= dirs.src.scss %>/popup.scss'],
            '<%= dirs.public.css %>/options.css': ['<%= dirs.src.scss %>/options.scss']
        }
    }

    // for the dev version of the extension only, add some extra debug code
    if (buildType === 'dev') {
        baseFileMap.background['<%= dirs.public.js %>/background.js'].push('<%= dirs.src.js %>/background/debug.es6.js')
    }

    /* watch any base files and browser specific files */
    let watch = {
        sass: ['<%= dirs.src.scss %>/**/*.scss'],
        ui: ['<%= dirs.src.js %>/ui/**/*.es6.js','<%= dirs.data %>/*.js'],
        background: ['<%= dirs.src.js %>/background/**/*.js','<%= dirs.data %>/*.js']
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            cache: '.cache',
            src: {
                js: 'shared/js',
                scss: 'shared/scss',
                templates: 'shared/templates'
            },
            data: 'shared/data',
            public: {
                js: `${buildPath}/public/js`,
                css: `${buildPath}/public/css`
            },
            test: 'test',
            unitTest: {
                background: `unit-test/background`,
                ui: `unit-test/ui`,
                build: `build/test`
            }
        },

        browserify: {
            ui: {
                options: { transform: ['babelify'] },
                files: baseFileMap.ui
            },
            background: {
                options: { transform: ['babelify'] },
                files: baseFileMap.background
            },
            backgroundTest: {
                options: { transform: ['babelify'] },
                files: baseFileMap.backgroundTest
            },
            unitTest: {
                options: {
                    transform: ['babelify'],
                    debug: true
                },
                files: baseFileMap.unitTest
            }
        },

        sass: {
            dist: {
                files: baseFileMap.sass
            }
        },

        execute: {
            preProcessLists: {
                src: ['scripts/buildLists.js', 'scripts/buildEntityMap.js']
            },
            tosdr: {
                src: ['scripts/tosdr.js']
            }
        },

        // used by watch to copy shared/js to build dir
        exec: {
            copyjs: `cp shared/js/*.js build/${browser}/${buildType}/js/ && rm build/${browser}/${buildType}/js/*.es6.js`
        },

        watch: {
            scss: {
                files: watch.sass,
                tasks: ['sass']
            },
            ui: {
                files: watch.ui, 
                tasks: ['browserify:ui']

            },
            backgroundES6JS: {
                files: watch.background,
                tasks: ['browserify:background']
            },
            backgroundJS: {
                files: ['<%= dirs.src.js %>/*.js'],
                tasks: ['exec:copyjs']
            }
        },

        karma: {
            unit: {
                options: {
                    configFile: 'karma.conf.js',
                    basePath: 'build/test/',
                    files: ['background.js']
                }
            }
        }
    })

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify:ui', 'browserify:background', 'execute:preProcessLists'])
    grunt.registerTask('dev', 'Build and watch files for development', ['build', 'watch'])
    grunt.registerTask('test','Build and run tests', ['browserify:unitTest','karma'])
    grunt.registerTask('default', 'build')
}
