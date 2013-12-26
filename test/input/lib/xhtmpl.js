define(["text", "handlebars"
//>>excludeStart("exclude", pragmas.optimize);
 	,"handlebars-ext"
//>>excludeEnd("exclude");
], function (text, Handlebars) {
	"use strict";

	var buildMap = [];

	/**
	 * @exports plug
	 * RequireJS plugin for importing Handlebars templates.
	 * @example "xhtmpl!app/templates/some-editor-page.hbs"
	 * During build with r.js (and using grunt-croc-requirejs plugin) it pre-compiles templates into js-code and writes it into output.
	 */
	var plug = {

		load: function (name, req, onLoad, config) {
			var url = req.toUrl(name);

//>>excludeStart("exclude", pragmas.optimizeSave);
			// In build-time: compile and store template's compiled code in map buildMap
			if (config.isBuild) {

				text.get(url, function (data) {
					if (config.isPrepareStage) {
						//console.log('xhtmpl.prepare: name=' + name);
						buildMap[name] = { path: url, text: Handlebars.precompile(data, { data: true }), isPrepareStage: true};
					} else if (config.isOptimizeStage) {
						//console.log('xhtmpl.optimize: name=' + name);
						buildMap[name] = { path: url, text: data, isOptimizeStage: true};
					}
/*
					buildMap[name] = { path: url, text: "Handlebars.template(" + Handlebars.precompile(data, { data: true }) + ")", isPrepareStage: true};
*/
					onLoad();
				});
			} else {
//>>excludeEnd("exclude");
				// In runtime (dev and production): return a HB-wrapper function for the template which encapsulates compiling on first access
				text.get(url, function (data) {
					onLoad(Handlebars.compile(data, { data: true }));
				});
//>>excludeStart("exclude", pragmas.optimizeSave);
			}
//>>excludeEnd("exclude");
		},

//>>excludeStart("exclude", pragmas.optimizeSave);
		write: function (pluginName, moduleName, write) {
			//console.log('xhtmpl.write: moduleName=' + moduleName);
			if (moduleName in buildMap) {
				var module = buildMap[moduleName];

				if (module.isPrepareStage) {
					write(module.text);
				} else if (module.isOptimizeStage) {
					write("define('" + pluginName + "!" + moduleName  + "'" +
						", ['handlebars'], function (Handlebars) { return Handlebars.template("
						+ module.text + ");});\n");
				}
			}
		}
//>>excludeEnd("exclude");
	};

	return plug;
});
