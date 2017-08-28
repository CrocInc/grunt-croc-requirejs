# grunt-croc-requirejs

[![NPM](https://nodei.co/npm/grunt-croc-requirejs.png?downloads=true&downloadRank=true)](https://nodei.co/npm/grunt-croc-requirejs/)

> Build RequireJS-based applications optimizing js, css and Handlebars templates.


## Getting Started

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-croc-requirejs --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-croc-requirejs');
```
Or just use `matchdep` module.


## Overview
Why do we need another Grunt task for merging RequireJS modules  if there're [plenty of them](https://npmjs.org/package/grunt-contrib-requirejs)? There is a major difference - this task generates a _layered_ application, i.e. all js scripts are not just combined into a single file but instead they are combined into several files - "layers". Here's motivation for such an approach.  
Usually a front-end application consists of a bunch of scripts. Some of them belongs to the application but other ones are some 3rd-party libraries. When an application is being developed app scripts are usually changed often but 3rd-party scripts much more rarely. So if we combine all scripts into a single one "mega" script then end-users of the application will have to redownload that script on every change.  
This task allows to split scripts into _layers_ so end-users will redownload only changed part of the application.  

Also the plugin provides some usefull optimization tools which allows you to:  

* combine all CSS files imported by AMD modules into a single CSS-script ("generic.css")  
* precompile Handlebars-templates imported by modules

### CSS
`xcss` plugin allows a module to import its CSS dependencies as regular AMD-modules.  
Usage example:  
```js
define([
	"jquery",
	"xcss!lib/ui/styles/jquery.blocked.css"
], function ($) {
});
```

Here we imported a CSS-file (`jquery.blocked.css`) as AMD-module.   
In run-time `xcss` plugin requests the CSS-file via XHR and adds its content into `STYLE` tag (under `HEAD`). So in a development environment CSS-script are fetched and added into page's `STYLE`. The nice thing is that modules control their CSS-files on their own.  
NOTE: All imports of CSS-files in all modules use a single `STYLE` tag to be IE-friendly.  

In build-time `xcss` plugin writes down content of CSS-files into a single file (by default it's 'generic.css', but can be controlled by `genericCssUrl` option). So at the end we'll have a single CSS-file with content of all CSS-scripts imported via `xcss` plugin. Obviously that script should be loaded via `link`:  
```html
<link rel='stylesheet' href='/client/content/generic.css' type='text/css'>
```
But it's not enough. In run-time for optimized (or built) application `xcss` plugin will do nothing. It becomes just a stub. So in runtime there is no any overhead for componentization.  
 
For loading CSS-files the plugin uses standard RJS's plugin [text](http://requirejs.org/docs/api.html#text "text"). It should be registered with alias "text".

### Handlebars templates 
`xhtmpl` plugin allows a module to import its Handlebars dependencies as regular AMD-modules.  
Usage example:
```js
define([
	"xhtmpl!lib/ui/Dialog/template.hbs"
], function (template) {
});
```

Here we imported a hbs-file (`lib/ui/Dialog/template.hbs`) as AMD-mobule. hbs-files are Handlebars templates. Actual files extension doesn't matter much. But it's usefull to name them as '*.hbs' due to HB-templates support in WebStorm and Visual Studio.  

In runtime the plugin fetches specified template and compiles it via [Handlebars](http://handlebarsjs.com/). Handlebars compiles templates into js code (functions).  
In build-time the plugin emits template's compiled js code as an AMD-module (the module returns template's function). In runtime for optimized (built) application `xhtmlp` plugin just returns already compiled function. So there is no compilation (i.e. overhead) in runtime for optimized applications.  

For loading templates (*.hbs) the plugin uses standard RJS's plugin [text](http://requirejs.org/docs/api.html#text "text"). It should be registered with alias "text".


## The `rjs` task

### Overview
In your project's Gruntfile, add a section named `rjs` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  rjs: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

### Options

#### makeConfigFile
Type: `String`  
Default value: `make.config.json`  
Required: no  

Build config file name. If the file exists then task will read its configuration from it. So if you create `make.config.json` beside `Gruntfile.js` then it will be used as task's config.  
Please note that parameters values from `Gruntfile.js` will overwrite values from external config file.  

#### input
Type: `String`  
Required: yes  

Input directory. It should point to a directory with root modules.

#### output
Type: `String`  
Required: no  

Output directory. If an output directory isn't specified then optimized files will be placed into input directory replacing its content. 

#### buildDir
Type: `String`  
Default value: `.make_build/`  
Required: no  

Temporary directory for build.

#### tempDir
Type: `String`  
Default value: `.make_tmp/`  
Required: no  

Temporary directory for intermediate result (should be discarded)

#### keepBuildDir
Type: `Boolean`  
Default value: `false`  
Required: no  

Do not remove buildDir and tempDir after build completes.

#### dirs
Type: `Array` of `String`  
Required: no  

Directories under input dir with standalone scripts (not referenced by app modules, usually injected on server) to optimize.


#### requireConfigFile
Type: `String`  
Default value: `require.config.json`  
Required: no  

RequireJS config file name (relative to input dir).

#### requireConfig
Type: `Object`  
Default value: `undefined`  
Required: no  

RequireJS config JSON object. It will override config from 'requireConfigFile' option.

#### requireConfigOutput
Type: `Object`  
Default value: `undefined`  
Required: no  

RequireJS config JSON for output optimized application (will override all other configs).


#### modules
Type: `Array`  
Default value: `undefined`  
Required: no  

Array of main modules names. If empty then all *.js files directly under input directory will be used.

#### ignoreModules
Type: `Array`  
Default value: `undefined`  
Required: no  

Array of modules names to ignore. They will not be included into layers modules

#### optimizeJs
Type: `String`  
Default value: `none`  
Required: no  

Optimization method of *.js files in terms of RJS: `none`, `uglify`.

#### optimizeCss
Type: `String`  
Default value: `none`  
Required: no  

Optimization method of *.css files in terms of RJS: `none`, `standard`, `standard.keepLines`.

#### generateSourceMaps
Type: `Boolean`  
Default value: `undefined`  
Required: no  

r.js option: If the minifier specified in the "optimize" option supports generating source maps for the minified code, then generate them.

#### preserveLicenseComments
Type: `Boolean`  
Default value: `false`  
Required: no  

r.js option: this option will turn off the auto-preservation of licence comments.

#### genericCssUrl
Type: `String`  
Default value: `content/generic.css`  
Required: no  

Path to generic.css - css file for combining all css imported via xcss.js. 

#### bundledLocale
Type: `String`  
Default value: `undefined`  
Required: no  

A locale to bundle - i.e. resources imported via `i18n` rjs plugin will be included into optimized js-modules and all other resources will be left unchanged.   
The value will be used as `locale` option for r.js.

#### layerOverrides
Type: `Object`  
Required: no  

An object-map with options overrides for particilar layers.  
For example you want to minify/uglify all modules except main and report-main:  
```
			optimizeJs: 'uglify2'
			layerOverrides: {
				"main": {
					optimizeJs: "none"
				},
				"report-main": {
					optimizeJs: "none"
				}
			}
```


## Project structure assumptions

The plugin assumes that client-side of a project has the following structure:

* all client stuff is inside a single folder (let's call it _client root_);
* client root contains _root modules_ - usually these are scripts which are loaded by RequireJS directly (e.g. via `data-main` attribute) - i.e. `main` scripts in terms of RequireJS;
* client root contains subfolders which are treated as `layers`. Usually we have `app`, `lib` and `vendor` folders (the app can also have any other folders). Scripts (*.js) which are in these layer-folders will be bundled together.


## Core concepts

### rjs optimizer
RequireJS provides rjs optimizer for building optimized version of apps. rjs is a script to be run under node.js. It has pletly of options - see [the doc](http://requirejs.org/docs/optimization.html).
This plugin grunt-croc-requirejs is just a wrapper around rjs optimizer.


### Root modules
`modules` option can specifies a bunch of files which will be treated as _root modules_. If `modules` options isn't specified then all *.js under `inputDir` will be treated as root modules.
rjs optimizer has two modes: optimizing directory and optimizing files. The plugin uses the latter mode. Files for rjs optimizer are specified in `modules` option. So these files we're callign as _root modules_.

### Layers

By default if you supply a main script to rjs optimizer it'll combine all depedency tree into a single minified script. rjs does support layers and shared scripts for multi-page applications - [see this official sample](https://github.com/requirejs/example-multipage). But it requires to do a lot of configuration.
This plugin supports splitting scripts onto layers depending on folder structure. For example let's consider an application has the following structure:
 
```
───Server
   ├───client
   │   ├───app
   │   │   ├───templates
   │   │   └───ui
   │   │       └───styles
   │   ├───boot
   │   ├───content
   │   │   ├───fonts
   │   │   └───images
   │   ├───lib
   │   │   └───...
   │   ├───modules
   │   │   └───...
   │   ├───shim
   │   ├───vendor
   │   │   └───...
   │   └───main.js
```
Here all client code is placed under `client` folder (_client root_). Under client root we can see `app`, `lib`, `vendor` and some other folders. They will layers names. After optimization we'll get:  

* main.js - all scripts imported from main.js except those which included into lib/vendor layers 
* lib-layer.js - all scripts from "lib" and "modules" folders (which are used by other scripts starting from main.js) 
* vendor-layer.js - all scripts from "vendor" folder


## Usage Examples

### Common options
```js
grunt.initConfig({
		rjs: {
			dist: {
				options: {
					input: 'dist/dev',
					output: 'dist/prod',
					requireConfigFile: 'require.config.json',
					requireConfigOutput: {
						paths: {
							handlebars: "vendor/handlebars/handlebars.runtime"
						}
					},
					genericCssUrl: 'content/generic.css',
					optimizeJs: 'uglify',
					optimizeCss: 'standard',
					generateSourceMaps: true,
					bundledLocale: 'ru'
				}
			}
		}
})
```

### Passing options for UglifyJS
If `optimizeJs` option specified as `uglify` then output files will be processed with [UglifyJS](https://github.com/mishoo/UglifyJS). It also has different options which you'd want to override.
For example, by default UglifyJS removes quotes for keys if they are not reserved words. This behavior can lead to runtime errors in IE8.  
Here's example how to pass options into UglifyJS via Grunt task's options:

```js
        rjs: {
            dist: {
                options: {
                    optimizeJs: 'uglify',
					requireConfig: {
						uglify: {
							output: {
								quote_keys: true
							}
						}
					},
                }
            }
        }
```

## Release History
 * 2017-08-28	v0.2.0	Support multiple folders for a layer (by default modules from "lib" and "modules" folders go to "lib-layer").  
 						Option `layerOverrides` for overriding options for particular layers.
 * 2016-12-26	v0.1.5	Updated README, updated dev-dependencies
 * 2015-12-07	v0.1.3	fix for NPM3 support
 * 2015-09-01	v0.1.0  Updated README
 * 2013-12-03	v0.1.0	Task submitted
 * 2013-08-27	v0.0.0	Work started

---
Task submitted by [Sergei Dorogin](http://about.dorogin.com)

(c) Copyright CROC Inc. 2013-2017
