/*
 * grunt-croc-requirejs
 * https://github.com/CrocInc/grunt-croc-requirejs
 * Copyright (c) 2013-2016 Croc Inc.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		// Before generating any new files, remove any previously-created files.
		clean: {
			test: ['test/output'],
		},

		concat: {
			options: {
				process: function(src, filepath) {
					return 'var require = ' + src + ';';
				},
			},
			// create rjs config 
			test: {
				src: 'test/input/require.config.json',
				dest: 'test/input/require.config.js'
			},
		},

		copy: {
			test: {
				files: [{
					src: '**/*.*',
					expand: true,
					cwd: 'rjs',
					dest: 'test/input/lib/'
				}]
			}	
		},

		// rjs task to be tested via test application in 'test/input' folder
		rjs: {
			test: {
				options: {
					input: 'test/input',
					output: 'test/output',
					requireConfigFile: 'require.config.json',
					requireConfigOutput: {
						paths: {
							handlebars: "vendor/handlebars/handlebars.runtime"
						}
					},
					modules: ['main'],
					genericCssUrl: 'content/generic.css',
					optimizeJs: 'none', // 'none', 'uglify2',
					optimizeCss: 'standard',
					generateSourceMaps: false,
					bundledLocale: 'ru',
					keepBuildDir: false
				}
			}
		},

		// TODO: Unit tests
		nodeunit: {
			tests: ['test/*_test.js'],
		}
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // "test": clean output -> execute rjs task -> check/assert (TODO)
  grunt.registerTask('test', ['clean', 'copy', 'concat', 'rjs', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
