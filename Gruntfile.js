module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    var static_dir = 'root/static/';
    var templates_dir = 'templates/';

    var build_tasks = [
        'handlebars:compile'
    ];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        static_dir: static_dir,
        templates_dir: templates_dir,

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

    grunt.registerTask('build', 'Compiles handlebars templates', build_tasks);
    grunt.registerTask('default', build_tasks);
}
