define(["text"], function (text) {
	"use strict";

//>>excludeStart("exclude", pragmas.optimizeSave);

	/**
	 * Modules imported via the plugin. A module is just a CSS file.
	 */
	var _buildMap = {};

	/**
	 * A relative path from 'generic.css' file to client root dir
	 */
	var _genericCssToRootPath;

	/**
	 * Replaces relative links in content of css-file onto links which are relative to the specified url (baseFileUrl)
	 * @param data Content of css file
	 * @param baseFileUrl base URL for new relative links
	 * @returns {String} new content of css file
	 */
	var _replaceCssRelativeUrls = function (data, baseFileUrl) {
		var url = baseFileUrl.replace(/\\/g, "/"),
			lastSlash = url.lastIndexOf("/"),
			baseUrl = lastSlash >= 0 ? url.slice(0, lastSlash + 1) : "";

		return data.replace(
			/url\(\s*(['"]?)((http:\/\/|https:\/\/|\/)?[^'"\s]*)\1\s*\)/g,
			function (text, quotes, url, prefix) {
				// do nothing for absolute urls
				if (prefix) {
					return text;
				}
				return "url(" + baseUrl + url + ")";
			}
		);
	};

//>>excludeEnd("exclude");

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
	var _includeCSSInternal = function (css) {
		var head,
			style = document.getElementById(_stylesheetTagID),
			href, i, len,
			links,
			link;

		if (!style) {
			// there's no our styles tag - create
			style = document.createElement('style');
			style.setAttribute('id', _stylesheetTagID);
			style.setAttribute('type', 'text/css');

			// find link to common.css and insert immediately after it
			head = document.getElementsByTagName('head')[0];
			links = head.getElementsByTagName("link");
			for(i = 0, len = links.length; i < len; i=i+1) {
				link = links[i];
				if (link.getAttribute("rel") === "stylesheet" && link.getAttribute("type") === "text/css") {
					href = link.getAttribute("href");
					if (href.indexOf("lib/ui/styles/root.css") > -1) {
						// insert style element before the next
						if (i !== len - 1) {
							head.insertBefore(style, links[i+1]);
							return;
						}
					}
				}
			}
			head.appendChild(style);
		}

		if (style.styleSheet) {   // IE
			style.styleSheet.cssText += css;
		} else {                  // the others
			style.appendChild(document.createTextNode(css));
		}
	};

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
		 загрузка ресурса
		 */
		load: function (name, req, onLoad, config) {
//>>excludeStart("exclude", pragmas.optimizeSave);
			var that = this,
				url = req.toUrl(name);

			// load content (css code)
			text.get(url, function (data) {

				if (config.isBuild) {
					// in build-time: remember path to from generic.css to baseDir
					if (!_genericCssToRootPath)
						_genericCssToRootPath = config.genericCssToRootPath;

					_buildMap[name] = { path: url, data: data, write: config.writeGenericCss };

				} else {
					// in runtime (non-optimized): include css as style tag into document's head
					that.helper.appendCssToPage(function () {
						return _replaceCssRelativeUrls(data, url);
					}, name);
				}
			});
//>>excludeEnd("exclude");
			onLoad();
		},

//>>excludeStart("exclude", pragmas.optimizeSave);
		/**
		 * Executed by r.js optimizer during build stage
		 **/
		write: function (pluginName, moduleName, write) {

			var module,
				content,
				cutPos,
				modPath,
				relCssPath;
			if (_genericCssToRootPath && _buildMap.hasOwnProperty(moduleName)) {

				module = _buildMap[moduleName];
				if (module.write) {

					// #1: fix urls in css
					// get folder path to the current module
					cutPos = moduleName.lastIndexOf("/");
					modPath = cutPos >= 0 ? moduleName.slice(0, cutPos + 1) : "";
					// form a new base path for substituting in css
					relCssPath = _genericCssToRootPath + modPath;

					// replace all links like 'url(folder/file.png)' in the module's content (css)
					// to make them relative to the generic.css location
					content = _replaceCssRelativeUrls(module.data, relCssPath);

					// #2: add module's css into common generic.css
					module.write(moduleName, module.path, content);
				}
			}
		}
//>>excludeEnd("exclude");
	};

	return plug;
});
