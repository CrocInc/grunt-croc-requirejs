# grunt-croc-requirejs

> Build RequireJS-based applications optimizing js, css and Handlebars templates.


## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-croc-requirejs --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-croc-requirejs');
```
Or just use `matchdep` module.

NOTE: loadNpmTasks will deprecate in Grunt 0.5

## Overview
Why do we need another rjs grunt task if there're [plenty of them](https://npmjs.org/package/grunt-contrib-requirejs)? There is a major difference - this task generates "layered" application, i.e. all js scripts are not just included into a single file but instead they are included into several files - "layers". Here's motivation for such an approach.  
Usually a front-end application consist of a bunch of scripts. Some of them belongs to the application but other ones are some 3rd party libraries. When an application is being developed app scripts are usually changed often but 3rd scripts much more rare. So if we combine all scripts into a single one then users will have to redownload this script on every change.
This task allow to split scripts into _layers_. 

Also the plugin provides some usefull optimization tools which allows you to:  

* combine all CSS files imported by modules into a single script ("generic.css"). 
* compile and combine all Handlebars-templates imported by modules

### CSS
Usage example:  
```js
define([
	"jquery",
	"xcss!lib/ui/styles/jquery.blocked.css"
], function ($) {
});
```  
Here we imported a css-file (`jquery.blocked.css`) as AMD-module.   
During run-time `xcss` plugin requests the css-file via XHR and adds its content into STYLE tag under HEAD. NOTE: All imports of css files in all modules use a single STYLE tag to be IE-friendly.     
During build-time `xcss` plugin writes down content of the css-file into a single file (by default 'generic.css').
 
For loading CSS files the plugin uses standard RJS's plugin [text](http://requirejs.org/docs/api.html#text "text"). It should be registered цшер alias "text".

### Handlebars templates 
Usage example:
```js
define([
	"xhtmpl!lib/ui/templates/Carousel.hbs"
], function (defaultTemplate) {
});
```
Here we imported a hbs-file (`lib/ui/templates/Carousel.hbs`) as AMD-mobule. hbs-files are Handlebars templates. Actual file extension doesn't matter much. But it's usefull to name them as '*.hbs' due to HB-templates support in WebStorm and VisualStudio.


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

Build config file name. If the file exists then task will read its configuration from it. So if you create 'make.config.json' besides Gruntfile.js then it will be used as task's config.
Please note then parameters values from Gruntfile.js will overwrite values from external config file. 

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

Optimization method of *.js files in terms of RJS: none, uglify, uglify2.

#### optimizeCss
Type: `String`  
Default value: `none`  
Required: no  

Optimization method of *.css files in terms of RJS: none, standard, standard.keepLines.

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

Path to generic.css - css file for combining all css imported with xcss.js. 

#### bundledLocale
Type: `String`  
Default value: `undefined`  
Required: no  

A locale to bundle - i.e. resources imported via i18n rjs plugin will be included into optimized js-modules and all other resources will be left unchanged.   
The value will be used as `locale` option for r.js.



### Usage Examples

#### Default Options
In this example, the default options are used to do something with whatever.

```js
grunt.initConfig({
  make: {
    options: {},

  },
})
```

####
```js
grunt.initConfig({
		make: {
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
					optimizeJs: 'uglify2',
					optimizeCss: 'standard',
					generateSourceMaps: true,
					bundledLocale: 'ru'
				}
			}
		}
})
```

## Release History
 * 2013-12-03	v0.1.0	Task submitted
 * 2013-08-27	v0.0.0	Work started

---
Task submitted by [Sergei Dorogin](http://dorogin.com)

(c) Copyright CROC Inc. 2013
