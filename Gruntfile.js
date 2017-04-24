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


    grunt.registerTask('build', 'Build project(s)css, templates, js', ['sass', 'handlebars:compile', 'concat', 'execute:preProcessLists']);
    grunt.registerTask('dev', 'Build and watch files for development', ['build', 'watch'])
    grunt.registerTask('default', 'build');
}
