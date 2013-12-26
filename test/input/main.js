require([
	"jquery",
	"core",
	"app/app",
], function ($, core, app) {
	"use strict";

	$(document).ready(function () {
		app.run();
	});
});