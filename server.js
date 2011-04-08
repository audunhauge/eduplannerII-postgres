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
  var seen = {};
  if (lastname == '') {
    // just one search word
    // we try department,institution
      var any = new RegExp(firstname.trim(),"i");
      var plain = firstname.trim().toUpperCase();
      for (var i in db.students) {
        var s = db.students[i];
        if (seen[s.id]) continue;
        if (s.lastname.match(any) || s.firstname.match(any) || s.department.match(any)  || s.institution.match(any)) {
           if (s) {
             list.push(s);
             seen[s.id] = 1;
           }
        }
      }
      for (var j in db.teachers) {
        var t = db.teachers[j];
        if (seen[t.id]) continue;
        if (t.lastname.match(any) || t.firstname.match(any) || t.department.match(any)  || t.institution.match(any)) {
           if (t) {
             list.push(t);
             seen[t.id] = 1;
           }
        }
      }
      if (db.memlist[plain]) {
        // the searchterm matches a groupname
        //var gr = courseteach[firstname.trim()].split('_')[1];
        var studlist = db.memlist[plain];
        for (j in studlist) {
          var s = db.students[studlist[j]];
          if (seen[s.id]) continue;
          if (s) {
             list.push(s);
             seen[s.id] = 1;
          }
        }
      } else { 
          if (db.coursesgr[plain]) {
          // the searchterm matches a coursename
          var grlist = db.coursesgr[plain];
          // all groups for this course
          for (i in grlist) {
            var gr = grlist[i];
            var tl = db.courseteach[plain+'_'+gr].teach;
            for (var k in tl) {
              t = db.teachers[tl[k]];
              if (t) {
                t.gr = gr;
                list.unshift(t);
              }
            }
            var studlist = db.memlist[gr];
            for (j in studlist) {
              var s = db.students[studlist[j]];
              if (s) {
                s.gr = gr;
                list.push(s);
              }  
            }
          }
        }

      }
  } else {
      firstname = firstname.trim();
      lastname = lastname.trim();
      console.log("fn="+firstname + " ln=" + lastname);
      console.log("scanning studs");
      for (var i in db.students) {
        var s = db.students[i];
        if (s.firstname.toLowerCase() == firstname && s.lastname.toLowerCase() == lastname) {
           if (s) list.push(s);
           return list;
        }
      }
      // scan thru teachers
      console.log("scanning teach");
      for (var j in db.teachers) {
        var t = db.teachers[j];
        if (t.firstname.toLowerCase() == firstname && t.lastname.toLowerCase() == lastname) {
           if (t) list.push(t);
           return list;
        }
      }
      var fn = new RegExp(firstname,"i");
      var ln = new RegExp(lastname,"i");
      console.log("regexp scanning studs");
      for (var i in db.students) {
        var s = db.students[i];
        if ( s.firstname.match(fn) && s.lastname.match(ln)) {
           if (s) list.push(s);
        }
      }
      console.log("regexp scanning teach");
      for (var j in db.teachers) {
        var t = db.teachers[j];
        if ( t.firstname.match(fn) && t.lastname.match(ln)) {
           if (t) list.push(t);
        }
      }
  }
  return list;
}

process.title = 'node-dummy';
process.addListener('uncaughtException', function (err, stack) {
	console.log('Caught exception: ' + err);
	console.log(err.stack.split('\n'));
});

/*
var connect = require('connect');
var MemStore = require('./memory');
*/
var assetManager = require('connect-assetmanager');
var assetHandler = require('connect-assetmanager-handlers');

var sys = require('sys'),
    connect = require('connect'),
    MemoryStore = connect.session.MemoryStore;

// One minute
var minute = 60000;

// Setup memory store
var memory = new connect.session.MemoryStore({
    reapInterval: minute
  , maxAge: minute * 2
});

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
        app.use(express.session({store: new MemoryStore( {
            reapInterval: 60000 * 10
          }),secret:"jalla"}));
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

var users = require('./users');

app.get('/logout', function(req, res) {
  delete req.session.user;
  delete req.userinfo;
  db_copy.userinfo = { uid:0 };
  res.redirect('/yearplan');
});

app.get('/login', function(req, res) {
  if (!req.query.username && req.session.user) {
      res.send(req.session.user);
      return;
  }
  users.authenticate(client,req.query.username, req.query.password, function(user) {
    console.log(user);
    if (user) {
      req.session.user = user;
      res.send(user);
      return;
    }
    res.send({id:0});
  });
});

app.post('/save_excursion', function(req, res) {
    // save excursion for given jday - slots
    // and given set of students
    /*
      var idd  = query.jd.substr(3);
      var jd = idd.split('_')[0];
      var day = idd.split('_')[1];
      var text = query.value;
      var name = query.name;
      var userid = query.userid;
      var klass = query.klass;
    */
    if (req.session.user && req.body.userid == req.session.user.id && req.session.user.department == 'Undervisning') {
      console.log("Teacher saving an excursion");
      var userlist = req.body.userlist;
      console.log(req.body);
      var rmsg = {ok:true, msg:""};
      var ulist = userlist.split(',');
      function stuffit(msg) {
          var us = ulist.pop();
          if (+us > 0) {
            req.body.userid = +us;
            database.saveabsent(req.session.user,req.body,stuffit);
          } else {
             delete addons.absent;
             res.send({ok:true, msg:"doneitall"});
          }
      };
      stuffit();
    } else {
      res.send({ok:false, msg:"bad user"});
    }
});
app.post('/save_absent', function(req, res) {
    // save absent for given jday - slots
    if (req.session.user && req.body.userid == req.session.user.id ) {
      console.log("User saved some data");
      database.saveabsent(req.session.user,req.body,function(msg) {
         res.send(msg);
         delete addons.absent;
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }
});

app.post('/create_course', function(req, res) {
    // create a new course
    if (req.session.user && req.session.user.isadmin) {
      console.log("admin creating new course");
      console.log(req.body);
      res.send({ok:true, msg:"new course"});
      //database.saveabsent(req.session.user,req.body,function(msg) {
      //   res.send(msg);
      //   delete addons.absent;
      //});
    } else {
      res.send({ok:false, msg:"bad user"});
    }
});

app.get('/getsql', function(req, res) {
    console.log("getting some general data");
    database.getSomeData(req.session.user, req.query.sql, req.query.param, function(data) {
      res.send(data);
    });
});

app.get('/getabsent', function(req, res) {
    // get absent list
    var justnow = new Date();
    if (addons.absent && ((justnow.getTime() - addons.update.absent.getTime())/60000 < 600  )  ) {
      res.send(addons.absent);
      var diff = (justnow.getTime() - addons.update.absent.getTime())/60000;
      console.log("resending tests - diff = " + diff);
    } else {
        database.getabsent(function(absent) {
            addons.absent = absent;
            addons.update.absent = new Date();
            res.send(absent);
          });
    }
});

app.post('/save_timetable', function(req, res) {
    // save a change of timetabledata
    // teachid,day,slot,value
    if (req.session.user && req.session.user.isadmin) {
      console.log("Admin changing a timetable");
      database.saveTimetableSlot(req.session.user,req.body,function(msg) {
         res.send(msg);
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }
});

app.post('/save_simple', function(req, res) {
    // save a julday for yearplan or freedays
    if (req.session.user && req.session.user.department == 'Undervisning') {
      console.log("User saved some data");
      database.savesimple(req.body,function(msg) {
         res.send(msg);
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }
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

app.post('/save_test', function(req, res) {
    // user has changed/created a test
    var justnow = new Date();
    if (req.session.user && req.session.user.department == 'Undervisning') {
      database.saveTest(req.session.user,req.body,function(msg) {
         console.log("returned here in app.post");
         console.log(msg);
         res.send(msg);
         delete addons.tests;
      });
    } else {
      res.send({ok:false, msg:"bad user"});
    }

});
app.post('/buytickets', function(req, res) {
    // user is selling tickets
    if (req.session.user ) {
      //console.log("User selling some tickets");
      database.selltickets(req.session.user,req.body,function(msg) {
         res.send(msg);
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

app.get('/tickets', function(req, res) {
    // only used by mdd
    database.gettickets(req.session.user, req.query,function(tickets) {
            res.send(tickets);
          });
});

app.get('/show', function(req, res) {
    // only used by mdd
    database.getshow(function(show) {
            res.send(show);
          });
});

app.get('/alltests', function(req, res) {
    // get new tests
    var justnow = new Date();
    if (addons.tests && ((justnow.getTime() - addons.update.tests.getTime())/60000 < 600  )  ) {
      res.send(addons.tests);
      var diff = (justnow.getTime() - addons.update.tests.getTime())/60000;
      console.log("resending tests - diff = " + diff);
    } else {
        database.getAllTests(function(prover) {
            addons.tests = prover;
            addons.update.tests = new Date();
            res.send(prover);
          });
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
    // get all reservations
    // they are expected to change often
    // only get reservations that are ! in the past
        database.getReservations(function(data) {
            res.send(data);
          });
});

app.get('/blocks', function(req, res) {
    // blocks dont change much - reuse value
    if (addons.blocks) {
      res.send(addons.blocks);
    } else database.getBlocks(function(blocks) {
            addons.blocks = blocks;
            res.send(addons.blocks);
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

app.get('/freedays', function(req, res) {
    // called when freedays have been changed
    database.getfreedays(); 
    res.send(db.freedays);
});

app.get('/yearplan', function(req, res) {
	var locals = { 'key': 'value' };
	locals = dummyHelper.add_overlay(app, req, locals);
	res.render('yearplan/index', locals);
});

app.get('/', function(req, res) {
  res.redirect('/yearplan');
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
        db.thisjd = julian.greg2jul(month,day,year );
        db.startjd = 7 * Math.floor(db.thisjd  / 7);
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
          //console.log(ulist);
          db_copy.userinfo = (ulist.length == 1) ? ulist[0] : { uid:0 };
          db_copy.ulist = ulist;
          //console.log(db_copy.userinfo);
          if (db_copy.userinfo) {
            db_copy.userinfo.isadmin = (admins[db_copy.userinfo.username] && admins[db_copy.userinfo.username] == 1) ? true : false;
            console.log(db_copy.userinfo.isadmin);
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
