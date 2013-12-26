
define('core',["jquery"], function ($) {
	

	/**
	 * @exports core
	 */
	var core = {};

	/**
	 * @class Application
	 * @param {XConfig} config XConfig object placed on the page on the server
	 * @param {Object} [options]
	 */
	core.Application = function (options) {
		var that = this;

		that.options = options || {};
		core.Application.current = that;
	};

	core.Application.prototype = {

		preinitialize: function () {},

		initialize: function () { },

		postinitialize: function () {
		},

		run: function (rootElement) {
			try {
				this._run(rootElement);
			} catch (e) {
				this._onStateChanged("failed", e);
			}
		},

		_run: function (rootElement) {
			var that = this;

			that._onStateChanged("loading");

			if (!rootElement)
				rootElement = document.body;

			that.rootElement = rootElement;

			that.preinitialize();

			that.initialize();

			that._onStateChanged("initialized");

			that._render();

			that.postinitialize();

			that._onStateChanged("started");
		},

		_render: function () {
			var that = this;
			if (that.options.template) {
				$(that.rootElement).html(that.options.template(that));
			}
		},

		_onStateChanged: function (state, error) {
			var that = this,
				args = {state: state};

			if (state === "failed") {
				args.error = error;
				if (error) {
					console.error(error);
					if (error.stack) {
						console.debug(error.stack);
					}
				} else {
					console.error("Application initialization error");
				}
			}
			that.onAppStateChanged(args);
		},

		onAppStateChanged: function (args) {
			var that = this;
			switch(args.state) {
				case "loading":
					that.onLoading();
					break;
				case "failed":
					that.onFailed(args.error);
					break;
				case "initialized":
					that.onInitialized();
					break;
				case "started":
					that.onStarted();
					break;
			}
		},
		onLoading: function () {},
		onInitialized: function () {},
		onStarted: function () {},
		onFailed: function (error) {}
	};

	return core;
});
define('handlebars-ext',[
	"handlebars"
], function (Handlebars) {
	

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
define('xcss',["text"], function (text) {
	


	/**
	 * Already processed css-file (in dev mode) - i.e. files were added into style tag
	 */
	var _stylesheetFiles = {};

	/**
	 * ID for special STYLE tag where we'll add all imported css-files in dev mode
	 */
	var _stylesheetTagID = "xcss_styles";

	/**
	 * Add css code into STYLE tag in HEAD. It tries to use the single STYLE tag with special ID "xcss_styles"
	 * @param css - style
	 */
	function _includeCSSInternal (css) {
		var head,
			style = document.getElementById(_stylesheetTagID);

		if (!style) {
			// there's no our styles tag - create
			style = document.createElement('style');
			style.setAttribute('id', _stylesheetTagID);
			style.setAttribute('type', 'text/css');
			head = document.getElementsByTagName('head')[0];
			head.appendChild(style);
		}

		if (style.styleSheet) {   // IE
			style.styleSheet.cssText += css;
		} else {                  // the others
			style.appendChild(document.createTextNode(css));
		}
	}

	/**
	 * @exports plug
	 * RequireJS plugin for importing css files as AMD-modules.
	 * @example define(['xcss!./ui/styles/styles.css', function () {}]
	 * Operating modes:
	 *  * development-runtime: plugin loads css-module as text and inserts it into html's style tag with id 'xcss_styles'
	 *  * build-build: loads css-module, replaces urls in it to make them relative to 'generic.css' and call 'writeGenericCss' callback supplied via config
	 *  * production-runtime: do nothing (load method just calls 'onLoad')
	 */
	var plug = {
		helper: {
			/**
			 * Append style element with css param's content
			 * @param {String|Function} css Content for style element or a function which returns it
			 * @param {String} name Name of the stylesheet to prevent duplication.
			 */
			appendCssToPage: function (css, name) {
				if (typeof css === "function") { css = css(); }
				if (!css) { return; }
				if (!name) {
					_includeCSSInternal(css);
				} else if (!_stylesheetFiles[name]) {
					_includeCSSInternal(css);
					_stylesheetFiles[name] = true;
				}
			}
		},

		/**
		 * загрузка ресурса
		 */
		load: function (name, req, onLoad, config) {
			onLoad();
		},

	};

	return plug;
});

define('xhtmpl',["text", "handlebars"
], function (text, Handlebars) {
	

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

				// In runtime (dev and production): return a HB-wrapper function for the template which encapsulates compiling on first access
				text.get(url, function (data) {
					onLoad(Handlebars.compile(data, { data: true }));
				});
		},

	};

	return plug;
});

define('lib-layer',[
	"core",
	"handlebars-ext",
	"xcss",
	"xhtmpl"
], function () {});