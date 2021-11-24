module.exports = function (grunt) {
    const sass = require('sass')
    const fileMapTransform = require('./scripts/browserifyFileMapTransform')
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
    grunt.loadNpmTasks('grunt-karma')

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
            '<%= dirs.public.js %>/feedback.js': ['<%= dirs.src.js %>/ui/pages/feedback.es6.js'],
            '<%= dirs.public.js %>/devtools-panel.js': ['<%= dirs.src.js %>/devtools/panel.es6.js'],
            '<%= dirs.public.js %>/list-editor.js': ['<%= dirs.src.js %>/devtools/list-editor.es6.js']
        },
        contentScope: {
            '<%= dirs.public.js %>/content-scope/*.js': ['<%= dirs.src.js %>/content-scope/*.js'],
        },
        background: {
            '<%= dirs.public.js %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js']
        },
        backgroundTest: {
            '<%= dirs.test %>/background.js': ['<%= dirs.src.js %>/background/background.es6.js', '<%= dirs.test %>/requireHelper.js']
        },
        autofillContentScript: {
            '<%= dirs.public.js %>/content-scripts/autofill.js': ['<%= ddgAutofill %>/autofill.js']
        },
        autofillCSS: {
            '<%= dirs.public.css %>/autofill.css': ['<%= ddgAutofill %>/autofill.css']
        },
        unitTest: {
            '<%= dirs.unitTest.build %>/background.js': ['<%= dirs.unitTest.background %>/**/*.js', '!<%= dirs.unitTest.background %>/reference-tests/**/*.js'],
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
        ui: ['<%= dirs.src.js %>/ui/**/*.es6.js', '<%= dirs.data %>/*.js', '<%= dirs.src.js %>/devtools/*.js'],
        background: ['<%= dirs.src.js %>/background/**/*.js', '<%= dirs.data %>/*.js'],
        contentScripts: ['<%= dirs.src.js %>/content-scripts/*.js'],
        autofillContentScript: ['<%= ddgAutofill %>/*.js'],
        autofillCSS: ['<%= ddgAutofill %>/*.css'],
        contentScope: ['<%= dirs.src.js %>/content-scope/*.js', '<%= dirs.public.js %>/inject/*.js'],
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

    const ddgAutofill = 'node_modules/@duckduckgo/autofill/dist'
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ddgAutofill,
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
                    ['babelify']
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
            autofillContentScript: {
                files: baseFileMap.autofillContentScript
            },
            unitTest: {
                options: {
                    browserifyOptions: {
                        debug: true
                    },
                    transform: [
                        fileMapTransform,
                        ['babelify'],
                        ['brfs']
                    ]
                },
                files: baseFileMap.unitTest
            }
        },

        sass: {
            options: {
                implementation: sass
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
            copyContentScope: `node scripts/inject.mjs ${browser} > build/${browser}/${buildType}/public/js/inject.js`,
            copyContentScripts: `cp shared/js/content-scripts/*.js build/${browser}/${buildType}/public/js/content-scripts/`,
            copyData: `cp -r shared/data build/${browser}/${buildType}/`,
            copyAutofillJs: `mkdir -p build/${browser}/${buildType}/public/js/content-scripts/ && cp ${ddgAutofill}/*.js build/${browser}/${buildType}/public/js/content-scripts/`,
            copyAutofillCSS: `cp -r ${ddgAutofill}/autofill.css build/${browser}/${buildType}/public/css/`,
            copyAutofillHostCSS: `cp -r ${ddgAutofill}/autofill-host-styles_${browser}.css build/${browser}/${buildType}/public/css/autofill-host-styles.css`
        },

        watch: {
            scss: {
                files: watch.sass,
                tasks: ['sass']
            },
            ui: {
                files: watch.ui,
                tasks: ['browserify:ui', 'exec:copyData']
            },
            contentScope: {
                files: watch.contentScope,
                tasks: ['exec:copyContentScope']
            },
            backgroundES6JS: {
                files: watch.background,
                tasks: ['browserify:background']
            },
            backgroundJS: {
                files: ['<%= dirs.src.js %>/*.js'],
                tasks: ['exec:copyjs']
            },
            contentScripts: {
                files: watch.contentScripts,
                tasks: ['exec:copyContentScripts']
            },
            autofillContentScript: {
                files: watch.autofillContentScript,
                tasks: ['exec:copyAutofillJs']
            },
            autofillCSS: {
                files: watch.autofillCSS,
                tasks: ['exec:copyAutofillCSS', 'exec:copyAutofillHostCSS']
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

    // Firefox and Chrome treat relative url differently in injected scripts. This fixes it.
    grunt.registerTask('updateFirefoxRelativeUrl', 'Update Firefox relative URL in injected css', () => {
        if (browser === 'firefox') {
            grunt.task.run('exec:updateFirefoxRelativeUrl')
        }
    })

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify:ui', 'browserify:background', 'browserify:backgroundTest', 'exec:copyContentScope', 'exec:copyAutofillJs', 'exec:copyAutofillCSS', 'exec:copyAutofillHostCSS', 'execute:preProcessLists'])

    const devTasks = ['build']
    if (grunt.option('watch')) { devTasks.push('watch') }

    grunt.registerTask('dev', 'Build and optionally watch files for development', devTasks)
    grunt.registerTask('test', 'Build and run tests', ['browserify:unitTest', 'karma'])
    grunt.registerTask('default', 'build')
}
