define([
	"jquery", 
	"core", 
	"handlebars", 
	"xhtmpl!app/templates/dashboard.hbs",
	"xcss!app/styles/root.css"],
function ($, core, Handlebars, template) {
	"use strict";
	
	var app = new core.Application({
		template: template
	});

	app.initialize = function () {
	};

	return app;
});