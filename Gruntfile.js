module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-execute');

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        dirs: {
            cache: '.cache',
            src: {
                js: 'js',
                css: 'css',
                templates: 'templates'
            },
            public: {
                js: 'public/js',
                css: 'public/css'
            }
        },

        browserify: {
            dist: {
                options: {
                    transform: [
                        ['babelify']
                    ]
                },
                files: {
                    '<%= dirs.public.js %>/base.js': ['<%= dirs.src.js %>/base/index.es6.js'],
                    '<%= dirs.public.js %>/trackers.js': ['<%= dirs.src.js %>/pages/trackers.es6.js'],
                    '<%= dirs.public.js %>/options.js': ['<%= dirs.src.js %>/pages/options.es6.js'],
                    '<%= dirs.src.js %>/abp.js': ['<%= dirs.src.js %>/abp-preprocessed.es6.js'],
                    '<%= dirs.src.js %>/url-parse.js': ['<%= dirs.src.js %>/url-parse.es6.js']
                }
            }
        },

        sass: {
            dist: {
                files: {
                    '<%= dirs.public.css %>/base.css': ['<%= dirs.src.css %>/base/base.scss'],
                    '<%= dirs.public.css %>/noatb.css': ['<%= dirs.src.css %>/noatb.scss'],
                    '<%= dirs.public.css %>/trackers.css': ['<%= dirs.src.css %>/trackers.scss'],
                    '<%= dirs.public.css %>/options.css': ['<%= dirs.src.css %>/options.scss']
                }
            }
        },

        execute: {
            preProcessLists: {
                src: ['scripts/buildLists.js', 'scripts/buildEntityMap.js']
            }
        },

        watch: {
            css: {
                files: ['<%= dirs.src.css %>/**/*.scss'],
                tasks: ['sass']
            },
            es6: {
                files: ['<%= dirs.src.js %>/**/*.es6.js'],
                tasks: ['browserify']
            }
        }
    });

    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'browserify', 'execute:preProcessLists']);
    grunt.registerTask('dev', 'Build and watch files for development', ['build', 'watch'])
    grunt.registerTask('default', 'build');
}
