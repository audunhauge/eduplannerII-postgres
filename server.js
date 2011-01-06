var Client = require('mysql').Client;
var client = new Client();
client.user = 'skeisvangmoodle3';
client.password = 'Bodric78?';
client.database = 'skeisvangmoodle3';
client.host = 'skeisvangmoodle3.mysql.domeneshop.no';
// client.debug = true;
console.log("connecting...");



var db = {
   studentIds : []    // array of students ids [ 2343,4567 ]
  ,students   : {}    // hash of student objects {  2343:{username,firstname,lastname,institution,department} , ... ]
  ,teachIds   : []    // array of teacher ids [ 654,1493 ... ]
  ,teachers   : {}    // hash of teach objects { 654:{username,firstname,lastname,institution}, ... }
  ,course     : []    // array of coursenames [ '1MAP5', '3INF5' ... ] - used by autocomplete
  ,freedays   : []    // array of freedays
  ,groups     : []    // array of groups
  ,category   : {}    // hash of coursename:category { '3inf5':4 , '1nat5':2 ... }
  ,classes    : ("1STA,1STB,1STC,1STD,1STE,1MDA,1MDB,2STA,2STB,2STC,"
                  + "2STD,2STE,2DDA,2MUA,3STA,3STB,3STC,3STD,3STE,3DDA,3MUA").split(",")
                      // array of class-names ( assumes all studs are member of
                      // one unique class - they are also member of diverse groups)

}

client.connect(function(err, results) {
    if (err) {
        console.log("ERROR: " + err.message);
        throw err;
    }
    console.log("connected.");
    client.query('USE skeisvangmoodle3', function(err, results) {
                if (err) {
                        console.log("ERROR: " + err.message);
                        throw err;
                }
                getBasicData(client);
        });

});

getBasicData = function(client) {
  // get some basic data from mysql
  // we want list of all users, list of all courses
  // list of all groups, list of all tests
  // list of all freedays, list of all bigtests (exams etc)
  // list of all rooms, array of coursenames (for autocomplete)
  client.query(
      // fetch students and teachers
      'SELECT id,username,firstname,lastname,department,institution from mdl_user where'
            + ' department not in ("old","system","") order by department,institution,lastname,firstname',
      function selectCb(err, results, fields) {
            if (err) {
                console.log("ERROR: " + err.message);
                throw err;
            }
            for (var i=0,k= results.length; i < k; i++) {
                var user = results[i];
                if (user.department == 'Undervisning') {
                  db.teachIds.push(user.id);
                  db.teachers[user.id] = user;
                } else {
                  db.studentIds.push(user.id);
                  db.students[user.id] = user;
                }
            }
      });
  client.query(
      // fetch courses, groups and course:categories
      'select c.id,c.shortname,c.category,count(ra.id) as cc from mdl_role_assignments ra inner join mdl_context x'
        + '  ON (x.id=ra.contextid and ra.roleid=5) inner join mdl_course c ON x.instanceid=c.id '
        + '                        group by c.id having cc > 2 order by cc',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var ghash = {}; // only push group once
          for (var i=0,k= results.length; i < k; i++) {
              var course = results[i];
              var elm = course.shortname.split('_');
              var cname = elm[0];
              var group = elm[1];
              db.course.push(cname);
              db.category[cname] = course.category;
              if (!ghash[group]) {
                db.groups.push(group);
                ghash[group] = 1;
              }
          }
          console.log(db);
      });
};

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
	//app.set('view engine', 'ejs');
	app.set('view engine', 'jade');
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
app.get('/yearplan', function(req, res) {
	var locals = { 'key': 'value' };
	locals = dummyHelper.add_overlay(app, req, locals);
	res.render('yearplan/index', locals);
});
app.get('/userlist', function(req, res) {
        res.send(userlist);
});

// Keep this just above .listen()
var dummyTimestamps = new dummyHelper.DummyHelper(app);

//The 404 route (ALWAYS keep this as the last route)
app.get('/*', function (req, res) {
    res.render('404');
});

app.listen(port, null);
new SocketServer(app);
