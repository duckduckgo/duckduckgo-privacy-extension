module.exports = function(grunt) {
    const through = require('through2')
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
    grunt.loadNpmTasks('grunt-karma')

    var values = require('object.values');

    if(!Object.values) {
        values.shim()
    }

    let browser = grunt.option('browser')
    let buildType = grunt.option('type')

    if(!(browser && buildType)) {
        console.error("Missing browser or  build type: --browser=<browser-name> --type=<dev,release>")
        process.exit(1)
    }

    let buildPath = `build/${browser}/${buildType}`


    /* These are files common to all browsers. To add or override any of these files
     * see the browserMap object below */
    let baseFileMap = {
        ui: {
            '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/index.es6.js'],
            '<%= dirs.public.js %>/popup.js': ['<%= dirs.src.js %>/ui/pages/popup.es6.js'],
            '<%= dirs.public.js %>/options.js': ['<%= dirs.src.js %>/ui/pages/options.es6.js'],
            '<%= dirs.public.js %>/feedback.js': ['<%= dirs.src.js %>/ui/pages/feedback.es6.js']
        },
        background: {
            '<%= dirs.public.js %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js']
        },
        backgroundTest: {
            '<%= dirs.test %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js', '<%= dirs.test %>/requireHelper.js']
        },
        unitTest: {
            '<%= dirs.unitTest.build %>/background.js': ['<%= dirs.unitTest.background %>/**/*.js'],
            '<%= dirs.unitTest.build %>/ui.js': ['<%= dirs.src.js %>/ui/base/index.es6.js', '<%= dirs.unitTest.ui %>/**/*.js'],
            '<%= dirs.unitTest.build %>/shared-utils.js': ['<%= dirs.unitTest.sharedUtils %>/**/*.js']
        },
        sass: {
            '<%= dirs.public.css %>/noatb.css': ['<%= dirs.src.scss %>/noatb.scss'],
            '<%= dirs.public.css %>/base.css': ['<%= dirs.src.scss %>/base/base.scss'],
            '<%= dirs.public.css %>/popup.css': ['<%= dirs.src.scss %>/popup.scss'],
            '<%= dirs.public.css %>/options.css': ['<%= dirs.src.scss %>/options.scss'],
            '<%= dirs.public.css %>/feedback.css': ['<%= dirs.src.scss %>/feedback.scss']
        }
    }

    // for the dev version of the extension only, add some extra debug code
    if (buildType === 'dev') {
        baseFileMap.background['<%= dirs.public.js %>/background.js'].unshift('<%= dirs.src.js %>/background/debug.es6.js')
    }

    /* watch any base files and browser specific files */
    let watch = {
        sass: ['<%= dirs.src.scss %>/**/*.scss'],
        ui: ['<%= dirs.src.js %>/ui/**/*.es6.js','<%= dirs.data %>/*.js'],
        background: ['<%= dirs.src.js %>/background/**/*.js','<%= dirs.data %>/*.js']
    }

    let karmaOps = {
        configFile: 'karma.conf.js',
        basePath: 'build/test/',
        files: ['background.js','ui.js','shared-utils.js']
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
                sharedUtils: `unit-test/shared-utils`,
                build: `build/test`
            }
        },

        browserify: {
            options: {
                browserifyOptions: {
                    debug: buildType === 'dev'
                },
                transform: [
                    ['babelify'],
                    [(file) => {
                        return through( function(buf, enc, next) {
                            let requireName = browser
                            if(browser === 'duckduckgo.safariextension') {
                                requireName = 'safari'
                            }
                            else if (browser === 'firefox') {
                                requireName = 'chrome'
                            }
                            this.push(buf.toString('utf8').replace(/\$BROWSER/g, requireName))
                            next()
                        })
                    }]
                ]
            },
            ui: {
                files: baseFileMap.ui
            },
            background: {
                files: baseFileMap.background
            },
            backgroundTest: {
                files: baseFileMap.backgroundTest
            },
            unitTest: {
                options: {
                    browserifyOptions: {
                        debug: true
                    }
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
                src: ['scripts/buildEntityMap.js']
            },
            tosdr: {
                src: []//'scripts/tosdr.js']
            }
        },

        // used by watch to copy shared/js to build dir
        exec: {
            copyjs: `cp shared/js/*.js build/${browser}/${buildType}/js/ && rm build/${browser}/${buildType}/js/*.es6.js`,
            tmpSafari: `mv build/${browser}/${buildType} build/${browser}/tmp && mkdir -p build/${browser}/${buildType}/`, 
            mvSafari: `mv build/${browser}/tmp build/${browser}/${buildType}/ && mv build/${browser}/${buildType}/tmp build/${browser}/${buildType}/${browser}`, 
            mvWatchSafari: `rsync -ar build/${browser}/${buildType}/public build/${browser}/${buildType}/${browser}/ && rm -rf build/${browser}/${buildType}/public`
        },

        watch: {
            scss: {
                files: watch.sass,
                tasks: ['sass']
            },
            ui: {
                files: watch.ui, 
                tasks: ['browserify:ui', 'watchSafari']

            },
            backgroundES6JS: {
                files: watch.background,
                tasks: ['browserify:background', 'watchSafari']
            },
            backgroundJS: {
                files: ['<%= dirs.src.js %>/*.js'],
                tasks: ['exec:copyjs', 'watchSafari']
            }
        },

        karma: {
            unit: {
                options: karmaOps
            }
        }
    })

    // sets up safari directory structure so that it can be loaded in extension builder
    // duckduckgo.safariextension -> build type -> duckduckgo.safariextension -> build files
    grunt.registerTask('safari', 'Move Safari build', (() => {
        if (browser === 'duckduckgo.safariextension') {
            console.log("Moving Safari build")
            grunt.task.run('exec:tmpSafari')
            grunt.task.run('exec:mvSafari')
        }
    }))

    // moves generated files from watch into the correct build directory
    grunt.registerTask('watchSafari', 'Moves Safari files after watch', (() => {
        if (browser === 'duckduckgo.safariextension') {
            grunt.task.run('exec:mvWatchSafari')
        }
    }))

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify:ui', 'browserify:background', 'browserify:backgroundTest', 'execute:preProcessLists', 'safari'])

    const devTasks = ['build']
    if (grunt.option('watch')) { devTasks.push('watch') }

    grunt.registerTask('dev', 'Build and optionally watch files for development', devTasks)
    grunt.registerTask('test','Build and run tests', ['browserify:unitTest','karma'])
    grunt.registerTask('default', 'build')
}
