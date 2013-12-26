
define('xhtmpl!app/templates/dashboard.hbs', ['handlebars'], function (Handlebars) { return Handlebars.template(
function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<h1>Welcome</h1>\r\n<div>\r\nIt's a simple Single-Page Applicaiton.\r\n</div>";
  });});

define('app/app',[
	"jquery", 
	"core", 
	"handlebars", 
	"xhtmpl!app/templates/dashboard.hbs",
	"xcss!app/styles/root.css"],
function ($, core, Handlebars, template) {
	
	
	var app = new core.Application({
		template: template
	});

	app.initialize = function () {
	};

	return app;
});
require(["vendor-layer"], function () {
require(["lib-layer"], function () {
require([
	"jquery",
	"core",
	"app/app",
], function ($, core, app) {
	

	$(document).ready(function () {
		app.run();
	});
});
});
});
define("main", function(){});
