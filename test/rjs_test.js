// External libs.
var grunt = require('grunt');

// Load local tasks.
grunt.loadTasks('tasks');


exports['require'] = {
  setUp: function(done) {
    'use strict';
    done();
  },

  optimize: function(test) {
    'use strict';

	test.equal(true, true);

	// TODO:
	// We need to test:
	// - root.css was included into generic.css
	// - dashboard.hbs was compiled and included into main.js
	// - handlebars.js was replaced with handlebars.runtime.js
	// - core.js was included into lib-layer.js
	// - jquery.js was included into vendor-layer.js
	// - app.js was included into main.js

    test.done();
  }
};