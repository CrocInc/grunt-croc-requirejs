define([
	"handlebars"
], function (Handlebars) {
	"use strict";

	/**
	 * Extending Handlebars compiler for adding support of functions inside templates.
	 *
	 * This code is required at development-runtime and build-time (only on prepare stage).
	 * Also it MAY be required at production-runtime if an application uses dynamic templates compilation.
	 * Because of this the compiler extensions is kept (not stripped out during building) but checks JavaScriptCompiler.
	 * If an app currently uses handlebars.runtime then JavaScriptCompiler will be undefined.
	 * @param parent
	 * @param name
	 * @param type
	 * @returns {string}
	 */
	if (Handlebars.JavaScriptCompiler) {
		Handlebars.JavaScriptCompiler.prototype.nameLookup = function (parent, name, type) {
			if (parent === "helpers") {
				if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name))
					return parent + "." + name;
				else
					return parent + "['" + name + "']";
			}

			if (/^[0-9]+$/.test(name)) {
				return parent + "[" + name + "]";
			} else if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
				// ( typeof parent.name === "function" ? parent.name() : parent.name)
				return "(typeof " + parent + "." + name + " === 'function' ? " + parent + "." + name + "() : " + parent + "." + name + ")";
			} else {
				return parent + "['" + name + "']";
			}
		};
	}

	return Handlebars;

});