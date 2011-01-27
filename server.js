var database = require('./database');
var julian = require('./julian');
var db = database.db;
var client = database.client;
db.starttime = '8.05 - 8.45,8.45 - 9.25,9.35 - 10.15,10.20 - 11.00,11.25 - 12.05,12.10 - 12.50,12.50 - 13.30,13.40 - 14.20,14.25 - 15.05,15.05'.split(',');

var addons = {}
// extra data that we send AFTER the main page has been drawn
// this so that the page seems more responsive
addons.update = {};
// used to store time info for resources
// we refetch if the resource is stale


function findUser(firstname,lastname) {
  // search for a user given firstname and lastname
  // try students first (studs may shadow teach)
  var list = [];
  firstname = firstname.trim();
  lastname = lastname.trim();
  console.log("fn="+firstname + " ln=" + lastname);
  for (var i in db.students) {
    var s = db.students[i];
    if (s.firstname.toLowerCase() == firstname && s.lastname.toLowerCase() == lastname) {
       list.push(s);
       return list;
    }
  }
  // scan thru teachers
  for (var j in db.teachers) {
    var t = db.teachers[j];
    if (t.firstname.toLowerCase() == firstname && t.lastname.toLowerCase() == lastname) {
       list.push(t);
       return list;
    }
  }
  var fn = new RegExp(firstname,"i");
  var ln = new RegExp(lastname,"i");
  for (var i in db.students) {
    var s = db.students[i];
    if ( s.firstname.match(fn) && s.lastname.match(ln)) {
       list.push(s);
    }
  }
  for (var j in db.teachers) {
    var t = db.teachers[j];
    if ( t.firstname.match(fn) && t.lastname.match(ln)) {
       list.push(t);
    }
  }
  return list;
}

process.title = 'node-dummy';
process.addListener('uncaughtException', function (err, stack) {
	console.log('Caught exception: ' + err);
	console.log(err.stack.split('\n'));
});
var connect = require('connect');
var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');
var MemStore = require('connect/middleware/session/memory');
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
        app.use(express.cookieDecoder());
        app.use(express.session({store: MemStore( {
            reapInterval: 60000 * 10
          })}));
	app.use(assets);
	app.use(connect.staticProvider(__dirname + '/public'));
});

app.dynamicHelpers({
	'cacheTimeStamps': function(req, res) {
		return assets.cacheTimestamps;
	},
        'session': function(req, res) {
                return req.session;
        },
        'userinfo': function(req, res) {
                return req.userinfo;
        },
      
        'flash': function(req, res) {
                return req.flash();
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

var users = require('./users');

app.get('/login', function(req, res) {
  if (req.session.user) {
      res.send(req.session.user);
      return;
  }
  users.authenticate(client,req.query.username, req.query.password, function(user) {
    if (user) {
      req.session.user = user;
      res.send(user);
    }
    res.send({id:0});
  });
});

app.get('/alltests', function(req, res) {
    // always query the dbase to get new tests
    // - TODO change to same logic as for allplans
        database.getAllTests(function(prover) {
            res.send(prover);
          });
});

app.post('/save_totfagplan', function(req, res) {
    // several sections may be changed
    if (req.session.user && req.session.user.department == 'Undervisning') {
      //console.log("User saved som data");
      database.updateTotCoursePlan(req.body,function(msg) {
         res.send(msg);
         delete addons.plans;
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }

});

app.post('/save_fagplan', function(req, res) {
    // user has new data to push into a plan
    if (req.session.user && req.session.user.department == 'Undervisning') {
      //console.log("User saved som data");
      database.updateCoursePlan(req.body,function(msg) {
         res.send(msg);
         delete addons.plans;
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }

});

app.get('/allplans', function(req, res) {
    // requery only if 10h since last query
    // we will refetch allplans if any of them have changed
    // - this we will know because the editor will fetch /saveplan
    // - /saveplan will then refetch allplans (after res.send )
    // thus allplans will mostly always be in memory
    var justnow = new Date();
    if (addons.plans && ((justnow.getTime() - addons.update.plans.getTime())/60000 < 600  )  ) {
      res.send(addons.plans);
      var diff = (justnow.getTime() - addons.update.plans.getTime())/60000;
      console.log("resending allplans - diff = " + diff);
    } else {
      database.getCoursePlans(function(plans) {
        addons.plans = plans
        addons.update.plans = new Date();
        res.send(plans);
      });
    }
});

app.get('/reserv', function(req, res) {
    // always query the dbase to get new tests
        database.getReservations(function(data) {
            res.send(data);
          });
});

app.get('/timetables', function(req, res) {
    // timetables dont change much - reuse value
    if (addons.timetable) {
      res.send(addons.timetable);
    } else database.getTimetables(function(timtab) {
            addons.timetable = timtab;
            res.send(addons.timetable);
          });
});

app.get('/yearplan', function(req, res) {
	var locals = { 'key': 'value' };
	locals = dummyHelper.add_overlay(app, req, locals);
	res.render('yearplan/index', locals);
});

app.get('/basic', function(req, res) {
        var admins = { "haau6257":1, "gjbe6257":1, "brer6257":1, "kvru6257":1 };
        // get some date info
        // this is done in database.js - but needs redoing here in case
        // the server has been running for more than one day
        // Some returned data will need to be filtered on date
        // The server should be restarted once every day.
        var today = new Date();
        var month = today.getMonth()+1; var day = today.getDate(); var year = today.getFullYear();
        db.firstweek = (month >8) ? julian.w2j(year,33) : julian.w2j(year-1,33)
        db.lastweek  = (month >8) ? julian.w2j(year+1,26) : julian.w2j(year,26)
        // info about this week
        db.startjd = 7 * Math.floor(julian.greg2jul(month,day,year ) / 7);
        db.startdate = julian.jdtogregorian(db.startjd);
        db.enddate = julian.jdtogregorian(db.startjd+6);
        db.week = julian.week(db.startjd);
        var db_copy = db;
        db_copy.userinfo = { uid:0 };
        if (req.query.navn) {
          var username = req.query.navn;
          username = username.replace(/æ/g,'e').replace(/Æ/g,'E').replace(/ø/g,'o');
          username = username.replace(/Ø/g,'O').replace(/å/g,'a').replace(/Å/g,'A');
          username = username.toLowerCase();
          var nameparts = username.split(" ");
          var ln = nameparts.pop();
          var fn = nameparts.join(' ');
          if (fn == '') { fn = ln; ln = '' };
          var ulist = findUser(fn,ln);
          console.log(ulist);
          db_copy.userinfo = (ulist.length > 0) ? ulist.pop() : { uid:0 };
          //console.log(db_copy.userinfo);
          if (db_copy.userinfo) {
            db_copy.userinfo.isadmin = (admins[db_copy.userinfo.username] && admins[db_copy.userinfo.username] == 1) ? true : false;
          }
          req.userinfo = db_copy.userinfo; 
        }
        res.send(db_copy);
});


//The 404 route (ALWAYS keep this as the last route)
app.get('/*', function (req, res) {
    res.render('404');
});

// Keep this just above .listen()
var dummyTimestamps = new dummyHelper.DummyHelper(app);

app.listen(port, null);
new SocketServer(app);
