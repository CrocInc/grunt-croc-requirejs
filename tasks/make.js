/*
 * grunt-croc-requirejs
 * Copyright (c) 2013 Croc Inc.
 * https://github.com/CrocInc/grunt-croc-requirejs
 * Licensed under the MIT license.
 */

'use strict';

/**
 * Makes from a filepath ("folder1/folder2/file.ext") a folder path to the root ("../../")
 */
function getPathToRoot(filePath) {
	filePath = filePath.replace(/\\/g, "/");

	var lastSlash = filePath.lastIndexOf("/");
	// strip out file name from the path
	filePath = lastSlash >= 0 ? filePath.slice(0, lastSlash + 1) : "";

	if (!filePath) {
		return "";
	}
    // now "folder1/folder2/file.ext" became "folder1/folder2/"
	filePath = filePath.replace(/[^/]+/g, "..");
	if (filePath.charAt(0) === "/") {
		filePath = filePath.slice(1);
	}
	return filePath;
}

var jsFileRegExp = /.*\.js$/;

module.exports = function(grunt) {

	grunt.registerMultiTask('rjs', 'Optimize RequireJS-based application', function() {
		var fs = require("fs"),
			path = require("path"),
			requirejs = require("../node_modules/requirejs/bin/r.js"),
			lang = require('./lib/lang'),
			file = require("./lib/file.js");

		var options = this.options(/** @lends options */ {
			// Build config file
			makeConfigFile: 'make.config.json',
			// Input directory: should point to a directory with root modules
			input: '',
			// Output directory
			output: '',
			// Temporary directory for build
			buildDir: '.make_build/',
			// Temporary directory for intermediate result (should be discarded)
			tempDir: '.make_tmp/',
			// Do not remove buildDir and tempDir after build completes
			keepBuildDir: false,

			// Directories under input dir with standalone scripts (not referenced by app modules, usually injected on server)
			dirs: [],

			// RequireJS config file (relative to input dir)
			requireConfigFile: 'require.config.json',
			// RequireJS config JSON (will override config from 'requireConfigFile' option)
			requireConfig: undefined,
			// RequireJS config JSON for output optimized application (will override all other configs)
			requireConfigOutput: undefined,

			// Array of main modules. If empty then all *.js files directly under input directory will be used.
			modules: [],
			ignoreModules: [],

			// Optimization method of *.js files in terms of RJS: none, uglify, uglify2
			optimizeJs: 'none',
			// Optimization method of *.css files in terms of RJS: none, standard, standard.keepLines
			optimizeCss: 'none',
			// r.js option: If the minifier specified in the "optimize" option supports generating source maps for the minified code, then generate them.
			generateSourceMaps: undefined,
			// r.js option: this option will turn off the auto-preservation of licence comments
			preserveLicenseComments: false,

			// Filepath to generic.css - css file for combining all css imported with xcss.js
			genericCssUrl: 'content/generic.css',
			// a locale to bundle
			bundledLocale: undefined
		});

		var startTimestamp = Date.now();

		// read options from "make.config.json"
		var configOptions = {};
		if (file.exists(options.makeConfigFile)) {
			configOptions = grunt.file.readJSON(options.makeConfigFile);
			options = lang.extend(configOptions, options);
		}
		
		if (!options.input) {
			grunt.warn('input directory should be specified');
		}

		var inputDir = options.input,
			outputDir = options.output,
			replaceInput = false,
			buildDir = path.resolve(path.join(options.input, '..', options.buildDir)),
			tempDir = path.resolve(path.join(options.input, '..', options.tempDir)),
			modules = options.modules;

		if (!outputDir) {
			grunt.log.writeln('Output directory wasn`t specified so it will be written into input directory'.yellow);
			replaceInput = true;
			outputDir = path.resolve(path.join(options.input, '../.make_output/'));
		}
		grunt.verbose.writeln('inputDir: ' + inputDir);
		grunt.verbose.writeln('outputDir: ' + outputDir);
		grunt.verbose.writeln('buildDir: ' + buildDir);

		// Initialize root modules, if they weren't specified in options then we'll use *.js under 'input' directory
		if (!modules.length) {
			grunt.verbose.writeln('Option "modules" was not specified. All .js files directly under input dir will be used.'.grey);
			fs.readdirSync(inputDir).forEach(function (f) {
				if (path.extname(f) === ".js") {
					modules.push(path.basename(f, ".js"));
				}
			});
			grunt.log.writeln("Found " + modules.length + " modules: " + modules.join(", "));
		}

		// normalize RequireJS config
		var requireConfig;  // effective RequireJS config object
		if (options.requireConfigFile) {
			var requireConfigFile = path.join(inputDir, options.requireConfigFile);
			if (file.exists(requireConfigFile)) {
				requireConfig = grunt.file.readJSON(requireConfigFile);
			}
		}
		if (options.requireConfig) {
			requireConfig = lang.extendEx(requireConfig, options.requireConfig , {deep: true});
		}
		if (!requireConfig) {
			grunt.log.writeln('Didn\'t find any requirejs config'.red);
		}

		// path to the root for genetic.css filepath (i.e. "content/generic.css" will become "../"
		var genericCssToRootPath = getPathToRoot(options.genericCssUrl);
		// file path to "generic.css", make it relative to app root
		var genericCssPath = path.join(outputDir, options.genericCssUrl);

		if (options.optimizeJs !== "none" && options.generateSourceMaps !== false) {
			options.generateSourceMaps = true;
		}
		// modules (files) imported by our plugins xhtmpl (*.hbs) and xcss (*.css)
		var modulesToDelete = [];

		grunt.verbose.writeln('Effective options: ' + JSON.stringify(options));

    	// This task is asynchronous.
	    var done = this.async();

		// layers: we'll split all js modules into layers basing on their folders
		var layers = [{
				name: "vendor-layer",
				dir: "vendor",
				modules: {}
			}, {
				name: "lib-layer",
				dir: "lib",
				modules: {}
			}];

		// STEP 0: copy source files into 'build' dir
		grunt.log.write('Copying source files into build dir...');
		file.deleteFile(buildDir);
		file.copyDir(inputDir, buildDir);
		grunt.log.writeln('OK'.green);

		// STEP 1: collect modules being used in layers
		function generateLayers () {
			grunt.log.write("Generating layers...");

			var config = lang.extend({}, requireConfig, {
				isPrepareStage: true,
				optimize: "none",
				optimizeCss: "none",
				appDir: buildDir,
				dir: tempDir,
				baseUrl: "./",
				logLevel: 2, // WARN
				removeCombined: false,
				skipDirOptimize: true,
				keepBuildDir: false,
				skipSemiColonInsertion: true,
				pragmas: {
					prepare: true,
					build: true
				},
				// Pragmas for rjs plugins:
				pragmasOnSave: {
					prepareSave: true
				},
				// main (root) modules:
				modules: modules.map(function (module) { return { name: module }; }),
				onBuildWrite: function (moduleName, modulePath, contents) {
					// put moduleName into some layer basing on its path
					layers.some(function (layer) {
						var relPath = path.relative(path.resolve(config.dir), modulePath);
						if (relPath.indexOf(layer.dir) === 0) {
							if (options.ignoreModules) {
								if (options.ignoreModules.some(function (m) {
									return m === moduleName;
								})) {
									return;
								}
							}
							layer.modules[moduleName] = true;
						}
					});
					if (moduleName.indexOf('xhtmpl!') === 0) {
						modulesToDelete.push(path.join(outputDir, modulePath.slice('xhtmpl!'.length)));

						// Manually save pre-compiled template back into buildDir as
						// we're currently saving into tempDir (that's why we can't rely on returning content)

						// NOTE: manually remove leading semicolon
						// TODO: the code should be removed after migrating on 2.1.9 (with skipSemiColonInsertion support)
						if (contents.charAt(contents.length-1) === ";") {
							contents = contents.slice(0, contents.length-1);
						}
						file.saveFile(path.join(buildDir, modulePath.slice('xhtmpl!'.length)), contents);
					}
					//return contents;
					return "// this is a stub for finding layer's dependencies: moduleName=" + moduleName;
				}
			});

			requirejs.optimize(
				config,
				lang.safeCallback(function () {
					// create layer modules using 'layers' structure created in onBuildWrite:
					// every 'layer module' is an empty RJS module with imports (via define([..])) of all modules inside this layer
					layers.forEach(function (layer) {
						var modules = Object.keys(layer.modules).sort(),
							content = "define([\n\t\"" + modules.join("\",\n\t\"") + "\"\n], function () {});";
						file.saveFile(path.join(buildDir, layer.name) + ".js", content);
					});

					grunt.log.writeln('OK'.green);

					// Go to next step
					optimizeModules();
				}),
				lang.errorCallback
			);
		}

		// STEP 2: optimizing
		function optimizeModules () {
			grunt.log.write("Optimizing...");

			var mainModuleOverride = {
				// Specify a callback to be called for writing down app root modules content.
				// The callback wraps modules content into several nested 'require' calls (one for each layer modules)
				onBuildWrite: function (moduleName, modulePath, contents) {
					if (contents.indexOf("require(") < 0) { return contents; }
					var start = "", end = "";
					layers.forEach(function (l) {
						start += "require([\"" + l.name + "\"], function () {\n";
						end += "\n});";
					});
					return contents.replace("require(", start + "require(") + end;
				}
			};
			function writeGenericCss (moduleName, modulePath, content) {
				grunt.verbose.writeln('Combining ' + moduleName + ' into ' + genericCssPath);
				var genericCssContent;
				if (file.exists(genericCssPath)) {
					genericCssContent = file.readFile(genericCssPath);
				}
				genericCssContent = genericCssContent ? genericCssContent + "\n" + content : content;
				file.saveFile(genericCssPath, genericCssContent);
				// remove original css
				file.deleteFile(modulePath);
			}
			// See https://github.com/jrburke/r.js/blob/master/build/example.build.js
			var config = lang.extend({}, requireConfig, {
				isOptimizeStage: true,
				optimize: options.optimizeJs,
				optimizeCss: options.optimizeCss,
				appDir: buildDir,
				dir: outputDir,
				baseUrl: "./",
				logLevel: 2, // WARN
				removeCombined: true,
				//skipDirOptimize: false,
				skipDirOptimize: true,
				keepBuildDir: false,
				locale: options.bundledLocale,
				preserveLicenseComments: options.preserveLicenseComments,
				generateSourceMaps: options.generateSourceMaps,
				writeGenericCss: writeGenericCss,
				// Custom parameter for xcss.js: path from 'generic.css' to baseDir
				genericCssToRootPath: genericCssToRootPath,
				// Pragmas for rjs plugins:
				pragmas: {
					optimize: true,
					build: true
				},
				pragmasOnSave: {
					optimizeSave: true
				},
				modules: [
					// here we'll combine layer modules and app root modules
				]
			});
			if (options.requireConfigOutput) {
				config = lang.extendEx(config, options.requireConfigOutput, {deep: true});
			}

			// Initialize config.modules - root modules to optimize
			// First we're adding "layer modules" (built on the previous step)
			var excludedLayers = options.ignoreModules;
			layers.forEach(function (l) {
				config.modules.push({
					name: l.name,
					exclude: excludedLayers.slice()
				});
				excludedLayers.push(l.name);
			});
			// then add root application modules (main.js and so on)
			modules.forEach(function (m) {
				config.modules.push({
					name: m,
					exclude: excludedLayers,
					override: mainModuleOverride
				});
			});
			
			requirejs.optimize(
				config,
				lang.safeCallback(optimizeBootModules),
				lang.errorCallback
			);
		}

		// STEP 3: Optimize boot modules (there are no references onto them but they also should be optimized)
		function optimizeBootModules () {
			grunt.log.writeln('OK'.green);
			if (!options.dirs || !options.dirs.length) {
				finalize();
				return;
			}
			grunt.util.async.forEachSeries(options.dirs, function(dir, next) {
				if (typeof dir === 'string') {
					dir = {
						combine: false,
						name: dir
					}
				}
				optimizeDir(dir, next);
			}, function () {
				finalize();
			});
		}
		function getCommonRjsConfig () {
			var config = lang.extend({}, requireConfig, {
				logLevel: 2, // WARN
				optimize: options.optimizeJs,
				optimizeCss: options.optimizeCss,
				locale: options.bundledLocale,
				preserveLicenseComments: options.preserveLicenseComments,
				generateSourceMaps: options.generateSourceMaps,
				// Pragmas for rjs plugins:
				pragmas: {
					optimize: true,
					build: true
				},
				pragmasOnSave: {
					optimizeSave: true
				}
			});
			return config;
		}
		function optimizeDir(dir, next) {
			grunt.log.writeln('Optimizing dir: ' + JSON.stringify(dir));

			var dirSrc = path.join(buildDir, dir.name),
				dirDst;
			var config = lang.extend(getCommonRjsConfig(), {
				isOptimizeStage: true,
				baseUrl: "./",
				removeCombined: true,
				skipDirOptimize: false,
				keepBuildDir: false
			});

			if (dir.combine) {
				// STEP 3.1: (optionally) combine files in 'dir' into single file
				var outFileName = dir.out || (dir.name + '.js');
				var outFile = path.join(dirSrc, outFileName);
				var modules = [];
				var content = '';
				var files = file.getFilteredFileList(dirSrc, {include: jsFileRegExp, exclude: /.*\.src\.js$/});
				files.forEach(function (fileName) {
					modules.push(file.getFileName(fileName));
					content = content  + file.readFile(fileName) + '\n';
				});
				if (content.length > 0) {
					file.cleanDir(dirSrc, jsFileRegExp);
					file.deleteFile(path.join(outputDir, dir.name));
					file.saveFile(outFile, content);
					grunt.verbose.writeln('Combining and optimizing modules ' + modules + ' into ' + outFile);
					config.name = path.join(
							path.relative(path.resolve('.'), buildDir),
							dir.name,
							outFileName.slice(0, outFile.indexOf(".js"))
						); //'dist/.make_build/boot/boot';

					if (outFileName.search(/[/\\]/) < 0) {
						// outFileName is a file name not a file path
						outFileName = path.join(dir.name, outFileName);
					}
					config.out = path.join(outputDir, outFileName);
					file.cleanDir(file.parent(path.join(outputDir, outFileName)), jsFileRegExp);

					requirejs.optimize(
						config,
						lang.safeCallback(function () {
							grunt.verbose.writeln('optimize dir ' + JSON.stringify(dir) + ' completes');
							next();
						}),
						lang.errorCallback
					);
				} else {
					grunt.log.writeln(('No modules found in ' + dirSrc).yellow);
					next();
				}
			} else {
				grunt.verbose.writeln('Optimizing scripts in ' + dirSrc);
				config.appDir = dirSrc;
				config.dir = tempDir;

				requirejs.optimize(
					config,
					lang.safeCallback(
					function () {
						file.deleteFile(path.join(outputDir, dir.name));
						dirDst = path.join(outputDir, dir.out || dir.name);
						file.makeDir(dirDst);
						file.copyDir(tempDir, dirDst, /(\.js$)|(\.map)/);

						grunt.verbose.writeln('optimize dir ' + JSON.stringify(dir) + ' completes');

						next();
					}),
					lang.errorCallback
				);
			}
		}

		// STEP 4:
		function finalize () {

			if (modulesToDelete && modulesToDelete.length) {
				grunt.verbose.writeln('Deleting compiled assets (hbs/css)');
				modulesToDelete.forEach(function (path) {
					grunt.verbose.write('Deleting ' + path.cyan + '...');
					file.deleteFile(path);
					grunt.verbose.writeln('OK'.green);
				});
			}
			if (replaceInput) {
				file.deleteFile(inputDir);
				if (!file.exists(inputDir)) {
					file.renameFile(outputDir, inputDir);
				} else {
					file.copyDir(outputDir, inputDir);
				}
			}
			if (!options.keepBuildDir) {
				file.deleteFile(buildDir);
				file.deleteFile(tempDir);
			}

			var taken = '' + (Date.now() - startTimestamp)/1000;
			grunt.log.writeln("Done.".green + ' It took ' + taken.cyan + ' secs');
			done();
		}

		// Run!
		generateLayers();
	});
};
