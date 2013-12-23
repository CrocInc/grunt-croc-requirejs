var fs = require("fs");
var path = require("path");

var isWindows = process.platform === 'win32',
	windowsDriveRegExp = /^[a-zA-Z]:\/$/,
	backSlashRegExp = /\\/g,
	exclusionRegExp = /^\./,
	pathSlipRegExp = /[/\\]/;

function frontSlash(path) {
	return path.replace(backSlashRegExp, '/');
}

function exists(path) {
	if (isWindows && path.charAt(path.length - 1) === '/' &&
		path.charAt(path.length - 2) !== ':') {
		path = path.substring(0, path.length - 1);
	}

	try {
		fs.statSync(path);
		return true;
	} catch (e) {
		return false;
	}
}

function mkDir(dir) {
	if (!exists(dir) && (!isWindows || !windowsDriveRegExp.test(dir))) {
		fs.mkdirSync(dir, 511);
	}
}

function mkFullDir(dir) {
	var parts = dir.split(pathSlipRegExp),
		currDir = '',
		first = true;

	parts.forEach(function (part) {
		//First part may be empty string if path starts with a slash.
		currDir += part + '/';
		first = false;

		if (part) {
			mkDir(currDir);
		}
	});
}

var file = module.exports = {};

file.getLineSeparator = function () {
	return '/';
};

file.exists = function (fileName) {
	return exists(fileName);
};

/**
 * Return parent path for a given path.
  */
file.parent = function (fileName) {
	var parts = fileName.split(pathSlipRegExp);
	parts.pop();
	return parts.join('/');
};

/**
 * Return file name for a given path.
 */
file.getFileName = function (fileName) {
	var parts = fileName.split(pathSlipRegExp);
	if (parts.length > 0) {
		return parts[parts.length-1];
	}
	return fileName;
};

/**
 * Gets the absolute file path as a string, normalized
 * to using front slashes for path separators.
 * @param {String} fileName
 */
file.absPath = function (fileName) {
	return frontSlash(path.normalize(frontSlash(fs.realpathSync(fileName))));
};

file.normalize = function (fileName) {
	return frontSlash(path.normalize(fileName));
};

file.isFile = function (path) {
	return fs.statSync(path).isFile();
};

file.isDirectory = function (path) {
	return fs.statSync(path).isDirectory();
};

/**
 *
 * @param {String} startDir
 * @param {RegExp|{include:RegExp,exclude:RegExp}} [regExpFilters]
 * @param {Boolean} [makeUnixPaths]
 * @returns {Array}
 */
file.getFilteredFileList = function (startDir, regExpFilters, makeUnixPaths) {
	//summary: Recurses startDir and finds matches to the files that match regExpFilters.include
	//and do not match regExpFilters.exclude. Or just one regexp can be passed in for regExpFilters,
	//and it will be treated as the "include" case.
	//Ignores files/directories that start with a period (.) unless exclusionRegExp
	//is set to another value.
	var files = [], topDir, regExpInclude, regExpExclude, dirFileArray,
		i, stat, filePath, ok, dirFiles, fileName;

	topDir = startDir;

	regExpInclude = regExpFilters.include || regExpFilters;
	regExpExclude = regExpFilters.exclude || null;

	if (file.exists(topDir)) {
		dirFileArray = fs.readdirSync(topDir);
		for (i = 0; i < dirFileArray.length; i++) {
			fileName = dirFileArray[i];
			filePath = path.join(topDir, fileName);
			stat = fs.statSync(filePath);
			if (stat.isFile()) {
				if (makeUnixPaths) {
					//Make sure we have a JS string.
					if (filePath.indexOf("/") === -1) {
						filePath = frontSlash(filePath);
					}
				}

				ok = true;
				if (regExpInclude) {
					ok = filePath.match(regExpInclude);
				}
				if (ok && regExpExclude) {
					ok = !filePath.match(regExpExclude);
				}

				if (ok && (!file.exclusionRegExp ||
					!exclusionRegExp.test(fileName))) {
					files.push(filePath);
				}
			} else if (stat.isDirectory() &&
				(!exclusionRegExp || !exclusionRegExp.test(fileName))) {
				dirFiles = file.getFilteredFileList(filePath, regExpFilters, makeUnixPaths);
				files.push.apply(files, dirFiles);
			}
		}
	}

	return files; //Array
};

file.copyDir = function (/*String*/srcDir, /*String*/destDir, /*RegExp?*/regExpFilter, /*boolean?*/onlyCopyNew) {
	//summary: copies files from srcDir to destDir using the regExpFilter to determine if the
	//file should be copied. Returns a list file name strings of the destinations that were copied.
	regExpFilter = regExpFilter || /\w/;

	//Normalize th directory names, but keep front slashes.
	//path module on windows now returns backslashed paths.
	srcDir = frontSlash(path.normalize(srcDir));
	destDir = frontSlash(path.normalize(destDir));

	var fileNames = file.getFilteredFileList(srcDir, regExpFilter, true),
		copiedFiles = [], i, srcFileName, destFileName;

	for (i = 0; i < fileNames.length; i++) {
		srcFileName = fileNames[i];
		destFileName = srcFileName.replace(srcDir, destDir);

		if (file.copyFile(srcFileName, destFileName, onlyCopyNew)) {
			copiedFiles.push(destFileName);
		}
	}

	return copiedFiles.length ? copiedFiles : null; //Array or null
};

file.copyFile = function (/*String*/srcFileName, /*String*/destFileName, /*boolean?*/onlyCopyNew) {
	//summary: copies srcFileName to destFileName. If onlyCopyNew is set, it only copies the file if
	//srcFileName is newer than destFileName. Returns a boolean indicating if the copy occurred.
	var parentDir;

	//logger.trace("Src filename: " + srcFileName);
	//logger.trace("Dest filename: " + destFileName);

	//If onlyCopyNew is true, then compare dates and only copy if the src is newer
	//than dest.
	if (onlyCopyNew) {
		if (file.exists(destFileName) && fs.statSync(destFileName).mtime.getTime() >= fs.statSync(srcFileName).mtime.getTime()) {
			return false; //Boolean
		}
	}

	//Make sure destination dir exists.
	parentDir = path.dirname(destFileName);
	if (!file.exists(parentDir)) {
		mkFullDir(parentDir);
	}

	fs.writeFileSync(destFileName, fs.readFileSync(srcFileName, 'binary'), 'binary');

	return true; //Boolean
};

/**
 * Renames a file. May fail if "to" already exists or is on another drive.
 */
file.renameFile = function (from, to) {
	return fs.renameSync(from, to);
};

/**
 * Reads a *text* file.
 */
file.readFile = function (/*String*/path, /*String?*/encoding) {
	if (encoding === 'utf-8') {
		encoding = 'utf8';
	}
	if (!encoding) {
		encoding = 'utf8';
	}

	var text = fs.readFileSync(path, encoding);

	//Hmm, would not expect to get A BOM, but it seems to happen,
	//remove it just in case.
	if (text.indexOf('\uFEFF') === 0) {
		text = text.substring(1, text.length);
	}

	return text;
};

file.saveUtf8File = function (/*String*/fileName, /*String*/fileContents) {
	//summary: saves a *text* file using UTF-8 encoding.
	file.saveFile(fileName, fileContents, "utf8");
};

file.saveFile = function (/*String*/fileName, /*String*/fileContents, /*String?*/encoding) {
	//summary: saves a *text* file.
	var parentDir;

	if (encoding === 'utf-8') {
		encoding = 'utf8';
	}
	if (!encoding) {
		encoding = 'utf8';
	}

	//Make sure destination directories exist.
	parentDir = path.dirname(fileName);
	if (!file.exists(parentDir)) {
		mkFullDir(parentDir);
	}

	fs.writeFileSync(fileName, fileContents, encoding);
};

file.deleteFile = function (/*String*/fileName) {
	//summary: deletes a file or directory if it exists.
	var files, i, stat;
	if (file.exists(fileName)) {
		stat = fs.statSync(fileName);
		if (stat.isDirectory()) {
			files = fs.readdirSync(fileName);
			for (i = 0; i < files.length; i++) {
				file.deleteFile(path.join(fileName, files[i]));
			}
			fs.rmdirSync(fileName);
		} else {
			fs.unlinkSync(fileName);
		}
	}
};

file.makeDir = function (path) {
	mkFullDir(path);
};

file.cleanDir = function (srcDir, regExpFilter) {
	srcDir = frontSlash(path.normalize(srcDir));
	var fileNames = file.getFilteredFileList(srcDir, regExpFilter, true);
	fileNames.forEach(function (fileName) {
		file.deleteFile(fileName);
	});
};