define(["jquery"], function ($) {
	"use strict";

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