module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    var static_dir = 'static/';
    var templates_dir = 'templates/';
    var js_dir = 'js/';
    var css_dir = 'css/';

    var build_tasks = [
        'handlebars:compile',
        'concat:js',
        'sass'
    ];

    var js_file = js_dir + 'popup.js';
    var css_file = css_dir + 'popup.css';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        static_dir: static_dir,
        templates_dir: templates_dir,
        build_tasks: build_tasks,

        // Compile handlebars templates
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
                    '<%= templates_dir %>/handlebars_tmp': '<%= templates_dir %>/*.handlebars'
                }
            }
        },

        // Concat handlebars templates with popup.js, copy result to static/js/popup.js
        concat: {
            js: {
                src: [
                    templates_dir + 'handlebars_tmp',
                    js_file
                ],
                dest: static_dir + js_file
            }
        },

        // Compile Sass into CSS and copy result to static/css/popup.css
        sass: {
            dist: {
                files: {
                    static_dir + css_file: css_dir + 'popup.scss',
                }
            }
        }
    });
    
    grunt.registerTask('build', 'Compiles handlebars templates', build_tasks);
    grunt.registerTask('default', build_tasks);
}
