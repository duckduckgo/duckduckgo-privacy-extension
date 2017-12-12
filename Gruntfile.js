module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt)
    grunt.loadNpmTasks('grunt-execute')
    
    let browser = grunt.option('browser')

    let baseFileMap = {
        ui: {
            '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/index.es6.js'],
            '<%= dirs.public.js %>/popup.js': ['<%= dirs.src.js %>/ui/pages/popup.es6.js'],
            '<%= dirs.public.js %>/options.js': ['<%= dirs.src.js %>/ui/pages/options.es6.js'],
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
     * Ex: safari: { ui: { '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/ui/base/yourfile.es6.js']}}
     */
    let browserMap = {
        firefox: {},
        chrome: {},
        safari: {},
    }

    let fileMap = {
        firefox: {
            ui: Object.assign(baseFileMap.ui, browserMap.firefox.ui || {}),
            background: Object.assign(baseFileMap.background, browserMap.firefox.background || {}),
            sass: Object.assign(baseFileMap.sass, browserMap.firefox.sass || {})
        },
        chrome: {
            ui: Object.assign(baseFileMap.ui, browserMap.chrome.ui || {}),
            background: Object.assign(baseFileMap.background, browserMap.chrome.background || {}),
            sass: Object.assign(baseFileMap.sass, browserMap.chrome.sass || {})
        },
        safari: {
            ui: Object.assign(baseFileMap.ui, browserMap.safari.ui || {}),
            background: Object.assign(baseFileMap.background, browserMap.safari.background || {}),
            sass: Object.assign(baseFileMap.sass, browserMap.safari.sass || {})
        },
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
                js: `browsers/${browser}/public/js`,
                css: `browsers/${browser}/public/css`
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

        watch: {
            css: {
                files: ['<%= dirs.src.css %>/**/*.scss'],
                tasks: ['sass']
            },
            ui: {
                files: ['<%= dirs.src.js %>/ui/**/*.es6.js'],
                tasks: ['browserify:ui']
            },
            background: {
                files: ['<%= dirs.src.js %>/*.es6.js'],
                tasks: ['browserify:background']
            }
        }
    })

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify', 'execute:preProcessLists'])
    grunt.registerTask('dev', 'Build and watch files for development', ['build', 'watch'])
    grunt.registerTask('default', 'build')
}
