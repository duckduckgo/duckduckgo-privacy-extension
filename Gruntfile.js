module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
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

    if (browser === 'duckduckgo.safariextension') browser = 'safari'

    /* These are files common to all browsers. To add or override any of these files
     * see the browserMap object below */
    let baseFileMap = {
        ui: {
            '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/index.es6.js'],
            '<%= dirs.public.js %>/popup.js': ['<%= dirs.src.js %>/ui/pages/popup.es6.js'],
            '<%= dirs.public.js %>/options.js': ['<%= dirs.src.js %>/ui/pages/options.es6.js']
        },
        background: {
            '<%= dirs.src.js %>/abp.js': ['<%= dirs.src.js %>/abp-preprocessed.es6.js'],
            '<%= dirs.src.js %>/tldjs.js': ['<%= dirs.src.js %>/tldjs.es6.js']
        },
        sass: {
            '<%= dirs.public.css %>/noatb.css': ['<%= dirs.src.scss %>/noatb.scss'],
            '<%= dirs.public.css %>/base.css': ['<%= dirs.src.scss %>/base/base.scss'],
            '<%= dirs.public.css %>/popup.css': ['<%= dirs.src.scss %>/popup.scss'],
            '<%= dirs.public.css %>/options.css': ['<%= dirs.src.scss %>/options.scss']
        }
    }

    /* Browser specific files here
     * Ex: safari: { ui: { '<%= dirs.public.js %>/yourFile.js': ['<%= dirs.src.js %>/ui/base/yourfile.es6.js']}}
     */
    let browserMap = {
        firefox: {ui: {}, background: {}, sass: {}},
        chrome: {ui: {}, 
            background: { 
            }, 
            sass: {}
        },
        safari: {ui: {
                '<%= dirs.public.js %>/base.js': ['browsers/duckduckgo.safariextension/js/ui/base/index.es6.js'],
        }, 
        sass: {}}
    }

    /* final file mapping used by grunt */
    let fileMap = {
        firefox: {
            ui: Object.assign(baseFileMap.ui, browserMap.firefox.ui),
            background: Object.assign(baseFileMap.background, browserMap.firefox.background),
            sass: Object.assign(baseFileMap.sass, browserMap.firefox.sass)
        },
        chrome: {
            ui: Object.assign(baseFileMap.ui, browserMap.chrome.ui),
            background: Object.assign(baseFileMap.background, browserMap.chrome.background),
            sass: Object.assign(baseFileMap.sass, browserMap.chrome.sass)
        },
        safari: {
            ui: Object.assign(baseFileMap.ui, browserMap.safari.ui),
            background: Object.assign(baseFileMap.background, browserMap.safari.background),
            sass: Object.assign(baseFileMap.sass, browserMap.safari.sass)
        },
    }

    /* watch any base files and browser specific files */
    let watch = {
        sass: [['<%= dirs.src.scss %>/**/*.scss'], Object.values(fileMap[browser].sass)].join().split(','),
        ui: [['<%= dirs.src.js %>/ui/**/*.es6.js'], Object.values(fileMap[browser].ui)].join().split(','),
        background: [['<%= dirs.src.js %>/*.es6.js'], Object.values(fileMap[browser].background)].join().split(',')
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
            public: {
                js: `${buildPath}/public/js`,
                css: `${buildPath}/public/css`
            }
        },

        browserify: {
            ui: {
                options: { transform: ['babelify'] },
                files: fileMap[browser].ui
            },
            background: {
                options: { transform: ['babelify'] },
                files: fileMap[browser].background
            }
        },

        sass: {
            dist: {
                files: fileMap[browser].sass
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
            copyjs: `cp shared/js/*.js build/${browser}/${buildType}/js/ && rm build/${browser}/${buildType}/js/*.es6.js`,
            copySafari: `cp browsers/duckduckgo.safariextension/js/*.js ${buildPath}/js`
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
        }
    })

    let tasks = {
        dev : ['build', 'watch']
    }
    if (browser === 'safari') tasks.dev = ['build', 'exec:copySafari', 'watch']

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify', 'execute:preProcessLists'])
    grunt.registerTask('dev', 'Build and watch files for development', tasks.dev)
    grunt.registerTask('default', 'build')
}
