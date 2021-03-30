module.exports = function (grunt) {
    const through = require('through2')
    const Fiber = require('fibers');
    const sass = require('sass')
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
    grunt.loadNpmTasks('grunt-karma')

    var values = require('object.values')

    if (!Object.values) {
        values.shim()
    }

    let browser = grunt.option('browser')
    let buildType = grunt.option('type')

    if (!(browser && buildType)) {
        console.error('Missing browser or  build type: --browser=<browser-name> --type=<dev,release>')
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
        contentScope: {
            '<%= dirs.public.js %>/content-scope/fingerprint.js': ['<%= dirs.src.js %>/content-scope/fingerprint.es6.js']
        },
        background: {
            '<%= dirs.public.js %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js']
        },
        backgroundTest: {
            '<%= dirs.test %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js', '<%= dirs.test %>/requireHelper.js']
        },
        emailContentScript: {
            '<%= dirs.public.js %>/content-scripts/autofill.js': ['<%= ddgAutofill %>/dist/autofill.js']
        },
        emailInjectedCSS: {
            '<%= dirs.public.css %>/email-style.css': ['<%= dirs.src.injectedCSS %>/email-autofill.css']
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

    if (browser === "safari14-email-autofill") {
        baseFileMap.ui = {
            '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/index.es6.js'],
            '<%= dirs.public.js %>/popup.js': ['<%= dirs.src.js %>/ui/pages/safari14-email-autofill/popup.es6.js'],
        }
        baseFileMap.sass = {
            '<%= dirs.public.css %>/base.css': ['<%= dirs.src.scss %>/base/base.scss'],
            '<%= dirs.public.css %>/popup.css': ['<%= dirs.src.scss %>/popup.scss'],
        }
        delete baseFileMap.backgroundTest
        delete baseFileMap.unitTest
    }

    // for the dev version of the extension only, add some extra debug code
    if (buildType === 'dev') {
        baseFileMap.background['<%= dirs.public.js %>/background.js'].unshift('<%= dirs.src.js %>/background/debug.es6.js')
    }

    /* watch any base files and browser specific files */
    let watch = {
        sass: ['<%= dirs.src.scss %>/**/*.scss'],
        ui: ['<%= dirs.src.js %>/ui/**/*.es6.js', '<%= dirs.data %>/*.js'],
        background: ['<%= dirs.src.js %>/background/**/*.js', '<%= dirs.data %>/*.js'],
        contentScripts: ['<%= dirs.src.js %>/content-scripts/*.js'],
        emailContentScript: ['<%= ddgAutofill %>/dist/*.js'],
        injectedCSS: ['<%= dirs.src.injectedCSS %>/*.css'],
        injectedContentScripts: ['<%= dirs.src.js %>/injected-content-scripts/*.js'],
        contentScope: ['<%= dirs.src.js %>/content-scope/*.js'],
        data: ['<%= dirs.data %>/*.js']
    }

    let karmaOps = {
        configFile: 'karma.conf.js',
        basePath: 'build/test/',
        files: ['background.js', 'ui.js', 'shared-utils.js']
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
        ddgAutofill: 'duckduckgo-autofill',
        dirs: {
            cache: '.cache',
            src: {
                js: 'shared/js',
                scss: 'shared/scss',
                injectedCSS: 'shared/injected-css',
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
                        return through(function (buf, enc, next) {
                            let requireName = browser
                            if (browser === 'duckduckgo.safariextension') {
                                requireName = 'safari'
                            } else if (browser === 'firefox') {
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
            emailContentScript: {
                files: baseFileMap.emailContentScript
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
            options: {
                implementation: sass,
                fiber: Fiber,
            },
            dist: {
                files: baseFileMap.sass
            }
        },

        execute: {
            preProcessLists: {
                src: ['scripts/buildEntityMap.js']
            },
            tosdr: {
                src: []// 'scripts/tosdr.js']
            }
        },

        // used by watch to copy shared/js to build dir
        exec: {
            copyjs: `cp shared/js/*.js build/${browser}/${buildType}/js/ && rm build/${browser}/${buildType}/js/*.es6.js`,
            // TODO make this deterministic with an index.js that includes the other files. Browserify output is bloated which might break things.
            copyContentScope: `cat shared/js/content-scope/*.js > build/${browser}/${buildType}/public/js/content-scope.js`,
            copyInjectedContentScripts: `cp -r shared/js/injected-content-scripts build/${browser}/${buildType}/public/js/`,
            copyContentScripts: `cp shared/js/content-scripts/*.js build/${browser}/${buildType}/public/js/content-scripts/`,
            copyAutofillJs: `mkdir -p build/${browser}/${buildType}/public/js/content-scripts/ && cp duckduckgo-autofill/dist/*.js build/${browser}/${buildType}/public/js/content-scripts/`,
            buildContentScript: `mkdir -p build/${browser}/${buildType}/public/js/content-scripts && cat shared/js/content-scripts/cookie.js shared/js/content-scripts/block-cookie.js > build/${browser}/${buildType}/public/js/content-scripts/content-script-bundle.js`,
            copyData: `cp -r shared/data build/${browser}/${buildType}/`,
            copyInjectedCSS: `cp -r shared/injected-css/* build/${browser}/${buildType}/public/css/`,
            // TODO: gsv can we remove this? it's removed upstream.
            // Firefox and Chrome treat relative url differently in injected scripts. This fixes it.
            updateFirefoxRelativeUrl: `sed -i.bak "s/chrome-extension:\\/\\/__MSG_@@extension_id__\\/public/../g" build/firefox/${buildType}/public/css/email-host-styles.css &&
                    rm build/firefox/${buildType}/public/css/email-host-styles.css.bak`,
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
                tasks: ['browserify:ui', 'watchSafari', 'exec:copyData']
            },
            contentScope: {
                files: watch.contentScope,
                tasks: ['exec:copyContentScope']
            },
            backgroundES6JS: {
                files: watch.background,
                tasks: ['browserify:background', 'watchSafari']
            },
            backgroundJS: {
                files: ['<%= dirs.src.js %>/*.js'],
                tasks: ['exec:copyjs', 'watchSafari']
            },
            injectedContentScripts: {
                files: watch.injectedContentScripts,
                tasks: ['exec:copyInjectedContentScripts']
            },
            contentScripts: {
                files: watch.contentScripts,
                tasks: ['exec:copyContentScripts', 'exec:buildContentScript']
            },
            emailContentScript: {
                files: watch.emailContentScript,
                tasks: ['exec:copyAutofillJs']
            },
            injectedCSS: {
                files: watch.injectedCSS,
                tasks: ['exec:copyInjectedCSS']
            },
            data: {
                files: watch.data,
                tasks: ['exec:copyData']
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
    grunt.registerTask('safari', 'Move Safari build', () => {
        if (browser === 'duckduckgo.safariextension') {
            console.log('Moving Safari build')
            grunt.task.run('exec:tmpSafari')
            grunt.task.run('exec:mvSafari')
        }
    })

    // moves generated files from watch into the correct build directory
    grunt.registerTask('watchSafari', 'Moves Safari files after watch', () => {
        if (browser === 'duckduckgo.safariextension') {
            grunt.task.run('exec:mvWatchSafari')
        }
    })

    // Firefox and Chrome treat relative url differently in injected scripts. This fixes it.
    // TODO: gsv can we remove this? it's removed upstream.
    grunt.registerTask('updateFirefoxRelativeUrl', 'Update Firefox relative URL in injected css', () => {
        if (browser === 'firefox') {
            grunt.task.run('exec:updateFirefoxRelativeUrl')
        }
    })

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify:ui', 'browserify:background', 'browserify:backgroundTest', 'exec:copyInjectedContentScripts', 'exec:copyAutofillJs', 'exec:copyInjectedCSS', 'exec:buildContentScript', 'updateFirefoxRelativeUrl', 'execute:preProcessLists', 'safari'])

    const devTasks = ['build']
    if (grunt.option('watch')) { devTasks.push('watch') }

    grunt.registerTask('dev', 'Build and optionally watch files for development', devTasks)
    grunt.registerTask('test', 'Build and run tests', ['browserify:unitTest', 'karma'])
    grunt.registerTask('default', 'build')
}
