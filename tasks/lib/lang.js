var lang = module.exports = {};

lang.forEach = function (obj, iterator, context) {
	if (obj == null) { return; }
	if (typeof obj.forEach === "function") {
		obj.forEach(iterator, context);
	} else {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				iterator.call(context, obj[key], key, obj);
			}
		}
	}
};

lang.extend = function (target) {
	Array.prototype.slice.call(arguments, 1).forEach(function (source) {
		lang.forEach(source, function (v, key) {
			target[key] = v;
		});
	});
	return target;
};

lang.isObject = function(obj) {
	return obj === Object(obj);
};

lang.extendEx = function (obj) {
	var options = arguments[arguments.length - 1] || {}; // last argument is options
	Array.prototype.slice.call(arguments, 1, arguments.length - 1).forEach(function (source) {
		lang.forEach(source, function (v, name) {
			if (v === undefined && !options.exact) { return; }

			if (!options.deep || !lang.isObject(v)) {
				obj[name] = v;
			} else {
				obj[name] = lang.extendEx(obj[name] || (Array.isArray(v) ? [] : {}), v, options);
			}
		});
	});
	return obj;
};

lang.errorCallback = function (e) {
	console.log(e.stack);
	process.nextTick(function () { throw e; });
};

lang.safeCallback = function (f) {
	return function () {
		try {
			return f.apply(this, arguments);
		} catch (e) {
			lang.errorCallback(e);
		}
	};
};
