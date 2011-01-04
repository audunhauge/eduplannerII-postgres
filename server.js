process.title = 'node-dummy';
process.addListener('uncaughtException', function (err, stack) {
	console.log('Caught exception: ' + err);
	console.log(err.stack.split('\n'));
});
var connect = require('connect');
var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');
var express = require('express');
var dummyHelper = require('./lib/dummy-helper');
var SocketServer = require('./lib/socket-server');
var fs = require('fs');
var sass = require('sass');

// preManipulate handler for compiling .sass files to .css
var sass_compile = function (file, path, index, isLast, callback) {
	if (path.match(/\.sass$/)) {
		callback(sass.render(file));
	} else {
		callback(file);
	}
};
var assets = assetManager({
	'js': {
		'route': /\/static\/js\/[0-9]+\/.*\.js/
		, 'path': './public/js/'
		, 'dataType': 'js'
		, 'files': [
			'plugins.js'
			, 'script.js'
			, 'jquery.client.js'
			, 'jquery.frontend-development.js'
		]
		, 'preManipulate': {
			'^': [
				function (file, path, index, isLast, callback) {
					if (path.match(/jquery.client/)) {
						callback(file.replace(/'#socketIoPort#'/, port));
					} else {
						callback(file);
					}
				}
			]
		}
		, 'postManipulate': {
			'^': [
				assetHandler.uglifyJsOptimize
				, function (file, path, index, isLast, callback) {
					callback(file);
					dummyTimestamps.content = Date.now();
				}
			]
		}
	}, 'css': {
		'route': /\/static\/css\/[0-9]+\/.*\.css/
		, 'path': './public/css/'
		, 'dataType': 'css'
		, 'files': [
			'boilerplate.css'
			, 'styles.sass'
			, 'boilerplate_media.css'
			, 'frontend-development.css'
		]
		, 'preManipulate': {
			'msie [6-7]': [
				sass_compile
				, assetHandler.fixVendorPrefixes
				, assetHandler.fixGradients
				, assetHandler.stripDataUrlsPrefix
			]
			, '^': [
				sass_compile
				, assetHandler.fixVendorPrefixes
				, assetHandler.fixGradients
				, assetHandler.replaceImageRefToBase64(__dirname + '/public')
			]
		}
		, 'postManipulate': {
			'^': [
				assetHandler.yuiCssOptimize
				, function (file, path, index, isLast, callback) {
					callback(file);
					dummyTimestamps.css = Date.now();
				}
			]
		}
	}
});
var port = 3000;
var app = module.exports = express.createServer();

app.configure(function() {
	app.set('view engine', 'ejs');
	app.set('views', __dirname + '/views');
});

app.configure(function() {
	app.use(connect.conditionalGet());
	app.use(connect.bodyDecoder());
	app.use(connect.logger({ format: ':req[x-real-ip]\t:status\t:method\t:url\t' }));
	app.use(assets);
	app.use(connect.staticProvider(__dirname + '/public'));
});

app.dynamicHelpers({
	'cacheTimeStamps': function(req, res) {
		return assets.cacheTimestamps;
	}
});

//setup the errors
app.error(function (err, req, res, next) {
	console.log(err.stack.split('\n'));
	res.render('500', {locals: {'err': err}});
});

//A route for creating a 500 error (useful to keep around for testing the page)
app.get('/500', function (req, res) {
    throw new Error('This is a 500 Error');
});

// Your routes
app.get('/', function(req, res) {
	var locals = { 'key': 'value' };
	locals = dummyHelper.add_overlay(app, req, locals);
	res.render('index', locals);
});

// Keep this just above .listen()
var dummyTimestamps = new dummyHelper.DummyHelper(app);

//The 404 route (ALWAYS keep this as the last route)
app.get('/*', function (req, res) {
    res.render('404');
});

app.listen(port, null);
new SocketServer(app);
