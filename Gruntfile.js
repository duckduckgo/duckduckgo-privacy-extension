module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);
    grunt.loadNpmTasks('grunt-execute');

    var static_dir = 'static/';
    var templates_dir = 'templates/';
    var js_dir = 'js/';
    var css_dir = 'css/';

    var build_tasks = [
        'handlebars:compile',
        'concat:js',
        'sass',
        'execute:preProcessLists'
    ];

    var js_file = js_dir + 'popup.js';
    var sass_file = css_dir + 'popup.scss';

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

        handlebars: {
            compile: {
                options: {
                    namespace: "Handlebars.templates",
                    processName: function(filepath) {
                        var parts = filepath.split('/');
                        return parts[parts.length - 1].replace('.handlebars', '');
                    }
                },
                files: {
                    '<%= dirs.cache %>/popup.handlebars.tmp': '<%= dirs.src.templates %>/popup/*.handlebars'
                }
            }
        },

        concat: {
            js: {
                files: {
                    '<%= dirs.public.js %>/popup.js': ['<%= dirs.cache %>/popup.handlebars.tmp', '<%= dirs.src.js %>/popup.js']
                }
            }
        },

        sass: {
            dist: {
                files: {
                    '<%= dirs.public.css %>/popup.css': '<%= dirs.src.css %>/popup.scss',
                }
            }
        },
        execute: {
            preProcessLists: {
                src: ['scripts/buildLists.js']
            }
        },
        watch: {
            css: {
                files: ['<%= dirs.src.css %>/**/*.scss'],
                tasks: ['sass']
            },
            javascript: {
                files: ['<%= dirs.src.js %>/**/*.js'],
                tasks: ['concat:js']
            },
            templates: {
                files: ['<%= dirs.src.templates %>/**/*.handlebars'],
                tasks: ['handlebars:compile', 'concat:js']
            }
        }
    });


    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'handlebars:compile', 'concat']);
    grunt.registerTask('dev', 'Build and watch files for development', ['build', 'watch'])
    grunt.registerTask('default', 'build');
}
