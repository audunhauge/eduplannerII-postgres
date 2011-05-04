var Client = require('mysql').Client;
var creds  = require('./creds');
var lev    = require('./levenshtein');

var client = new Client();
creds.setup(client);

var julian = require('./julian');

var db = {
   studentIds  : []    // array of students ids [ 2343,4567 ]
  ,students    : {}    // hash of student objects {  2343:{username,firstname,lastname,institution,department} , ... ]
  ,teachIds    : []    // array of teacher ids [ 654,1493 ... ]
  ,teachers    : {}    // hash of teach objects { 654:{username,firstname,lastname,institution}, ... }
  ,course      : []    // array of coursenames [ '1MAP5', '3INF5' ... ] - used by autocomplete
  ,freedays    : {}    // hash of juliandaynumber:freedays { 2347889:"Xmas", 2347890:"Xmas" ... }
  ,heldag      : {}    // hash of { 2345556:{"3inf5":"Exam", ... } }
  ,prover      : {}    // hash of { 2345556:[ {shortname:"3inf5_3304",value::"3,4,5",username:"haau6257" } ... ], ... }
  ,yearplan    : {}    // hash of { 2345556:["info om valg", 2345557:"Exam", ...], ...  }
  ,groups      : []    // array of groups
  ,nextyear    : {}    // info about next year
  ,memlist     : {}    // hash of { "3304":[234,45,454],"2303":[23, ...], ... }  -- group -> studs
  ,courseteach : {}    // hash of { "3inf5_3304":{teach:[654],id:6347},"2inf5":{teach:[654,1363],id:6348}," ... }  -- course -> {teach,id}
  ,grcourses   : {}    // hash of { "3304":[ "3inf5" ] , ... }  -- courses connected to a group
  ,coursesgr   : {}    // hash of { "3inf5":[ "3304" ] , ... }  -- groups connected to a course
  ,memgr       : {}    // hash of { 234:["3304","2303","3sta" ..], ... }  --- groups stud is member of
  ,teachcourse : {}    // array of courses the teacher teaches (inverse of courseteach)
  ,category    : {}    // hash of coursename:category { '3inf5':4 , '1nat5':2 ... }
  ,classes     : ("1STA,1STB,1STC,1STD,1STE,1MDA,1MDB,2STA,2STB,2STC,"
                  + "2STD,2STE,2DDA,2MUA,3STA,3STB,3STC,3STD,3STE,3DDA,3MUA").split(",")
                      // array of class-names ( assumes all studs are member of
                      // one unique class - they are also member of diverse groups)

}

// get some date info
var today = new Date();
var month = today.getMonth()+1; var day = today.getDate(); var year = today.getFullYear();
db.firstweek = (month >8) ? julian.w2j(year,33) : julian.w2j(year-1,33)
db.lastweek  = (month >8) ? julian.w2j(year+1,26) : julian.w2j(year,26)
db.nextyear.firstweek = (month >8) ? julian.w2j(year+1,33) : julian.w2j(year,33)
db.nextyear.lastweek  = (month >8) ? julian.w2j(year+2,26) : julian.w2j(year+1,26)
// info about this week
db.startjd = 7 * Math.floor(julian.greg2jul(month,day,year ) / 7);
db.startdate = julian.jdtogregorian(db.startjd);
db.enddate = julian.jdtogregorian(db.startjd+6);
db.week = julian.week(db.startjd);

// utility function (fill inn error and do callback)
function sqlrunner(sql,params,callback) {
  client.query( sql, params,
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          callback( {ok:true, msg:"inserted"} );
      });
}

client.connect(function(err, results) {
    if (err) {
        console.log("ERROR: " + err.message);
        throw err;
    }
    console.log("connected.");
    // client.query('USE skeisvangmoodle3', function(err, results) {
    client.query('USE skeisvangmoodle3', function(err, results) {
                if (err) {
                        console.log("ERROR: " + err.message);
                        throw err;
                }
                getBasicData(client);
        });

});

var getCoursePlans = function(callback) {
  client.query(
            'SELECT distinct concat(u.id,c.id,s.section) as idd, u.id as uid, u.username, c.id, u.institution'
          + ' ,c.startdate,c.shortname,c.numsections,s.section,s.summary,c.cost '
          + '   FROM mdl_role_assignments ra '
          + '        INNER JOIN mdl_user u ON u.id=ra.userid '
          + '        INNER JOIN mdl_context x ON x.id=ra.contextid '
          + '        INNER JOIN mdl_course c ON x.instanceid=c.id '
          + '        LEFT OUTER JOIN mdl_course_sections s ON s.course=c.id'
          //+ '   WHERE c.category in (2,3,4,6,10) '
          //  cost is the category for each course
          + '   WHERE c.cost in (1,2,3,4,10,11,12) '
          + '        AND ra.roleid = 3 '
          + '        AND s.section != 0 '
          + '        AND (isnull(s.summary) OR ( s.section < 50 AND s.section > 0)) '
          + '        AND u.department="Undervisning" '
          + '   ORDER BY u.institution,u.username,c.shortname,s.section ' ,
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var fliste = {}; 
          var compliance = {};  // is this a compliant teacher?
          var startdate   = 0;
          var numsections = 0;
          var prevsum = '';  // used to calc lev distance
          for (var i=0,k= results.length; i < k; i++) {
            fag = results[i];
            summary = (fag.summary) ? fag.summary : '';
            summary = summary.replace("\n",'<br>');
            summary = summary.replace("\r",'<br>');
            section = (fag.section) ? fag.section : '0';
            shortname = fag.shortname;
            username = fag.username;
            institution = fag.institution;
            if (startdate == 0) startdate = fag.startdate;
            if (numsections == 0) numsections = fag.numsections;
            if (!compliance[username]) {
                compliance[username] = {};
            }
            if (!compliance[username][shortname]) {
                compliance[username][shortname] = { sum:0, count:0 };
            }
            if (!fliste[institution]) {
                fliste[institution] = {};
            }
            if (!fliste[institution][username]) {
                fliste[institution][username] = {};
            }
            if (!fliste[institution][username][shortname]) {
                fliste[institution][username][shortname] = {};
            }
            fliste[institution][username][shortname][section] = summary;
            if (lev.lev(summary,prevsum) > 1) {
              compliance[username][shortname].sum += summary.length;
              compliance[username][shortname].count += (summary.length > 2) ? 1 : 0 ;
            }
            prevsum = summary;
          }
          var allplans = { courseplans:fliste, compliance:compliance, startdate:startdate, numsections:numsections };
          callback(allplans);
          console.log("got allplans");
      });
}

var updateTotCoursePlan = function(query,callback) {
  // update courseplan - multiple sections
  var updated = query.alltext.split('z|z');
  var usects = {};
  for (var uid in updated) {
      var u = updated[uid];
      var elm = u.split('x|x');
      var sectnum = elm[0],text=elm[1];
      text = text.replace('&amp;nbsp;',' ');
      text = text.replace('&nbsp;',' ');
      usects[+sectnum] = text;
  }
  var ok = true;
  var msg = '';
  client.query(
        'select s.* from mdl_course_sections s where s.course = ? ' , [ query.courseid],
      function (err, sections, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          for (var sid in sections) {
              var s = sections[sid];
              if (usects[s.section]) {
                  if (usects[s.section] != s.summary) {
                      // there is an update for this section and it differs from dbase
                      // we must update this section
                      client.query(
                          'update mdl_course_sections set summary=? where id=?',[ usects[s.section], s.id ],
                          function (err, results, fields) {
                              if (err) {
                                  ok = false;
                                  msg = err.message;
                              }
                          });
                  }
                  delete usects[s.section];
                  // unset this section - remaining sections in usects will be INSERTED
              }
          }
          for (sectnum in usects) {
              summary = usects[sectnum];
              client.query(
                  'insert into mdl_course_sections (course,section,summary) values (?,?,?)', [ query.courseid, sectnum, summary],
                  function (err, results, fields) {
                      if (err) {
                          ok = false;
                          msg = err.message;
                      }
                  });
          }
          callback( { ok:ok, msg:msg } );
      });
}

var saveabsent = function(user,query,callback) {
  // update/insert absent list
  var idd  = query.jd.substr(3);
  var jd = idd.split('_')[0];
  var day = idd.split('_')[1];
  var text = query.value;
  var name = query.name;
  var userid = query.userid;
  var klass = query.klass;
  console.log("Saving:",jd,text,name,userid,klass);
          console.log('delete from mdl_bookings_calendar'
      + ' where name = ? and (class=? or class=0 ) and userid= ? and eventtype="absent" and julday= ? ' , [ name,klass,userid, jd ]);
  if (text == '') client.query(
          'delete from mdl_bookings_calendar'
      + ' where name = ? and (? or (class=? or class=0 ) and userid= ?) and eventtype="absent" and julday= ? ' , [ name,user.isadmin,klass,userid, jd ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          });
  else client.query(
        'select * from mdl_bookings_calendar '
      + ' where name = ? and (class=? or class=0) and eventtype="absent" and userid= ? and julday= ? ' , [ name,klass, userid,  jd ],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var abs = results.pop();
          if (abs) {
              //console.log(abs);
              if (abs.value != text || abs.name != name) {
              client.query(
                  'update mdl_bookings_calendar set class=?, name=?,value=? where id=?',[ klass,name,text, abs.id ],
                  function (err, results, fields) {
                      if (err) {
                          callback( { ok:false, msg:err.message } );
                          return;
                      }
                      callback( {ok:true, msg:"updated"} );
                  });
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            console.log('insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value,name,class) values (0,?,?,"absent",?,?,?)',[userid,jd,text,name,klass]); 
            client.query(
                'insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value,name,class) values (0,?,?,"absent",?,?,?)',[userid,jd,text,name,klass],
                function (err, results, fields) {
                    if (err) {
                        callback( { ok:false, msg:err.message } );
                        return;
                    }
                    callback( {ok:true, msg:"inserted"} );
                });
          }
      });
}

var getabsent = function(callback) {
  // returns a hash of all absent teach/stud
  //  {  julday:{ uid:{value:"1,2",name:"Kurs"}, uid:"1,2,3,4,5,6,7,8,9", ... }
  client.query(
      'select id,userid,julday,name,value,class as klass from mdl_bookings_calendar where eventtype = "absent" and julday >= ?',[ db.startjd ],
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var absent = {};
          for (var i=0,k= results.length; i < k; i++) {
              var res = results[i];
              var julday = res.julday;
              var uid = res.userid;
              delete res.julday;   // save some space
              delete res.userid;   // save some space
              if (!absent[julday]) {
                absent[julday] = {}
              }
              absent[julday][uid] = res;
          }
          callback(absent);
          //console.log(absent);
      });
}

var savesimple = function(query,callback) {
  // update/insert yearplan/freedays
  var type = query.myid.substring(0,4);
  var typemap = { 'free':'fridager','year':'aarsplan' };
  var eventtype = typemap[type] || 'error';
  if (eventtype == 'error') {
     callback( { ok:false, msg:"invalid event-type" } );
  }
  var jd  = query.myid.substring(4);
  var text = query.value;
  if (text == '') client.query(
          'delete from mdl_bookings_calendar'
      + ' where eventtype=? and julday= ? ' , [ eventtype, jd ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          });
  else client.query(
        'select * from mdl_bookings_calendar '
      + ' where eventtype= ? and julday= ? ' , [ eventtype,  jd ],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var free = results.pop();
          if (free) {
              console.log(free);
              if (free.value != text) {
              client.query(
                  'update mdl_bookings_calendar set value=? where id=?',[ text, free.id ],
                  function (err, results, fields) {
                      if (err) {
                          callback( { ok:false, msg:err.message } );
                          return;
                      }
                      callback( {ok:true, msg:"updated"} );
                  });
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            console.log( 'insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value) values (0,2,?,?,?)',[jd,eventtype,text]);
            client.query(
                'insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value) values (0,2,?,?,?)',[jd,eventtype,text],
                function (err, results, fields) {
                    if (err) {
                        callback( { ok:false, msg:err.message } );
                        return;
                    }
                    callback( {ok:true, msg:"inserted"} );
                });
          }
      });
}

var saveTimetableSlot = function(user,query,callback) {
  // update/insert test

  var teachid  = query.teachid;
  var day = query.day;
  var slot = query.slot;
  var value = query.val;
  console.log(teachid,day,slot,value);
  if (value == '')  { 
    // dont actually delete anything from timetable
    /*client.query(
          'delete from mdl_bookings_calendar'
      + ' where day = ? and slot = ? and userid = ? and eventtype="timetable" ' , [ courseid,  user.id, julday ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          }); */
  } else client.query(
        'select * from mdl_bookings_calendar '
      + ' where userid = ? and day = ? and slot = ? and eventtype="timetable" ' , [ teachid,  day, slot ],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var time = results.pop();
          if (time) {
              console.log(time);
              if (time.value != value) {
              client.query(
                  'update mdl_bookings_calendar set value=?,name=? where id=?',[ value,value, time.id ],
                  function (err, results, fields) {
                      if (err) {
                          callback( { ok:false, msg:err.message } );
                          return;
                      }
                      callback( {ok:true, msg:"updated"} );
                  });
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            /*
            console.log("inserting new");
            client.query(
                'insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value) values (?,?,?,"prove",?)',[courseid, user.id, julday,tlist],
                function (err, results, fields) {
                    if (err) {
                        callback( { ok:false, msg:err.message } );
                        return;
                    }
                    callback( {ok:true, msg:"inserted"} );
                });
                */
          }
      });
}

var saveTest = function(user,query,callback) {
  // update/insert test

  var jd  = query.idd.substring(3).split('_')[0];
  var day = query.idd.substring(3).split('_')[1];
  var julday = (+jd) + (+day);
  var courseid = db.courseteach[query.coursename].id;
  var tlist = (query.timer) ? query.timer : '';
  console.log(tlist,julday,courseid,user);
  if (tlist == '') client.query(
          'delete from mdl_bookings_calendar'
      + ' where courseid = ? and userid = ? and eventtype="prove" and julday= ? ' , [ courseid,  user.id, julday ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          });
  else client.query(
        'select * from mdl_bookings_calendar '
      + ' where courseid = ? and userid = ? and eventtype="prove" and julday= ? ' , [ courseid,  user.id, julday ],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var test = results.pop();
          if (test) {
              console.log(test);
              if (test.value != tlist) {
              client.query(
                  'update mdl_bookings_calendar set value=? where id=?',[ tlist, test.id ],
                  function (err, results, fields) {
                      if (err) {
                          callback( { ok:false, msg:err.message } );
                          return;
                      }
                      callback( {ok:true, msg:"updated"} );
                  });
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            console.log("inserting new");
            client.query(
                'insert into mdl_bookings_calendar (courseid,userid,julday,eventtype,value) values (?,?,?,"prove",?)',[courseid, user.id, julday,tlist],
                function (err, results, fields) {
                    if (err) {
                        callback( { ok:false, msg:err.message } );
                        return;
                    }
                    callback( {ok:true, msg:"inserted"} );
                });
          }
      });
}


var savehd = function(user,query,callback) {
    console.log(query,user.id);
    var jd = query.myid;
    var val = query.value;
    var fag = query.fag;
    var kill = query.kill;
    var pid = query.pid;
    if (kill) {
      var elm = pid.split('_');
      fag = elm[1];
      jd = elm[0].substr(2);
      console.log(fag,jd);
      console.log('delete from mdl_bookings_calendar where eventtype="heldag" and name="'+fag+'" and julday='+jd);
    }
    client.query( 'delete from mdl_bookings_calendar'
      + ' where eventtype="heldag" and name=? and julday= ? ' , [ fag , jd ],
          function (err, results, fields) {
              if (err) {
                  console.log(err.message);
                  callback( { ok:false, msg:err.message } );
                  return;
              }
          });
    if (kill)  {
       console.log("deleted an entry");
       delete db.heldag[jd][fag];
       callback( {ok:true, msg:"deleted"} );
       return;
    }
    var itemid = 0;
    // see if we have a room name in the text
    // if there is one, then get the itemid for this room
    // and set the value for itemid
    var elm = val.split(/[ ,]/);
    for (var i in elm) {
      var ee = elm[i].toUpperCase();
      if ( db.roomids[ee] ) {
        // we have found a valid room-name
        itemid = db.roomids[ee];
        break;
      }
    }
    client.query(
        'insert into mdl_bookings_calendar (julday,name,value,itemid,courseid,userid,eventtype)'
        + ' values (?,?,?,?,3745,2,"heldag")' , [jd,fag,val,itemid],
        function (err, results, fields) {
            if (err) {
                callback( { ok:false, msg:err.message } );
                return;
            }
            if (!db.heldag[jd]) {
              db.heldag[jd] = {};
            }
            db.heldag[jd][fag] = val;
            callback( {ok:true, msg:"inserted"} );
        });
}

var selltickets = function(user,query,callback) {
    console.log(query);
    var today = new Date();
    var m = today.getMonth()+1; var d = today.getDate(); var y = today.getFullYear();
    var julday = julian.greg2jul(m,d,y);
    var showid = query.showid;
    var type = query.type;
    //console.log(query.accu);
    var accu = query.accu.split('|');
    var now = new Date();
    var jn = now.getHours()*100 + now.getMinutes();
    var values = [];
    for (var i in accu) {
        var elm = accu[i].split(',');
        values.push('('+showid+',"'+elm[0]+'",'+elm[1]+',"'+type+'",'+elm[2]+','+jn+','+julday+','+user.id+')' );
    }
    var valuelist = values.join(',');
    //console.log('insert into mdl_show_tickets (showid,showtime,price,kk,ant,saletime,jd,userid) values ' + values);
    client.query(
        'insert into mdl_show_tickets (showid,showtime,price,kk,ant,saletime,jd,userid) values ' + values,
        function (err, results, fields) {
            if (err) {
                callback( { ok:false, msg:err.message } );
                return;
            }
            callback( {ok:true, msg:"inserted"} );
        });
}


var updateCoursePlan = function(query,callback) {
  // update courseplan for given section
  client.query(
        'select s.* from mdl_course_sections s '
      + ' where s.course = ? and s.section = ? ' , [ query.courseid,  query.section],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var sect = results.pop();
          if (sect) {
            if (sect.summary != query.summary) {
              client.query(
                  'update mdl_course_sections set summary=? where id=?',[ query.summary, sect.id ],
                  function (err, results, fields) {
                      if (err) {
                          callback( { ok:false, msg:err.message } );
                          return;
                      }
                      callback( {ok:true, msg:"updated"} );
                  });
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            client.query(
                'insert into mdl_course_sections (course,section,summary) values ('+course.id+','+query.section+',"'+query.summary+'")',
                function (err, results, fields) {
                    if (err) {
                        callback( { ok:false, msg:err.message } );
                        return;
                    }
                    callback( {ok:true, msg:"inserted"} );
                });
          }
      });
}



var getSomeData = function(user,sql,param,callback) {
  // runs a query and returns the recordset
  // only allows admin to run this query
  if (!user || !user.isadmin) {
    callback("not allowed");
    return;
  }
  if (param == '') param = [];
  client.query(
      sql,param,
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          callback(results);
      });
}

var getBlocks = function(callback) {
  // returns a hash of all blocks (slots for tests for all courses in a block)
  // the first to digits in groupname gives the block
  // this should be changed to a property of a course
  client.query(
      'select id,julday,name,value from mdl_bookings_calendar where value != " " and eventtype = "blokk" ',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var blocks = {};
          for (var i=0,k= results.length; i < k; i++) {
              var res = results[i];
              var julday = res.julday;
              delete res.julday;   // save some space
              if (!blocks[julday]) {
                blocks[julday] = [];
              }
              blocks[julday].push(res);
          }
          callback(blocks);
          //console.log(blocks);
      });
}

var makereserv = function(user,query,callback) {
    console.log(query);
    var current = +query.current;
    var idlist  = query.idlist.split(',');
    var myid    = +query.myid;
    var room    = query.room;
    var message = query.message;
    var action  = query.action;
    var values  = [];
    var itemid = +db.roomids[room];
    switch(action) {
      case 'kill':
        //console.log("delete where id="+myid+" and uid="+user.id);
        sqlrunner('delete from mdl_bookings_calendar where eventtype="reservation" and id=? and userid=? ',[myid,user.id],callback);
        break;
      case 'update':
        console.log( 'update mdl_bookings_calendar set value = '+message+'where id='+myid+' and ('+user.isadmin+' or userid='+user.id+')' );
        sqlrunner( 'update mdl_bookings_calendar set value = ? where eventtype="reservation" and id=? and (? or userid=?) ',
             [message,myid,user.isadmin,user.id],callback);
        break;
      case 'insert':
        for (var i in idlist) {
            var elm = idlist[i].substr(3).split('_');
            var day = +elm[1];
            var slot = +elm[0];
            values.push('("reservation",3745,'+user.id+','+(current+day)+','+day+','+slot+','+itemid+',"'+room+'","'+message+'")' );
        }
        var valuelist = values.join(',');
        console.log( 'insert into mdl_bookings_calendar (eventtype,courseid,userid,julday,day,slot,itemid,name,value) values ' + values);
        client.query(
          'insert into mdl_bookings_calendar (eventtype,courseid,userid,julday,day,slot,itemid,name,value) values ' + values,
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"inserted"} );
          });
        break;
    }
}

var getReservations = function(callback) {
  // returns a hash of all reservations 
  client.query(
      'select id,userid,day,slot,itemid,name,value,julday,eventtype from mdl_bookings_calendar cal '
       + '      WHERE itemid > 0 and eventtype in ("heldag", "reservation") and julday >= ' + db.startjd ,
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var reservations = {};
          for (var i=0,k= results.length; i < k; i++) {
              var res = results[i];
              var julday = res.julday;
              delete res.julday;   // save some space
              if (!reservations[julday]) {
                reservations[julday] = [];
              }
              if (res.eventtype == 'heldag') {
                res.day = julday % 7;
                var roomname = db.roomnames[res.itemid];
                var repl = new RegExp(",? *"+roomname);
                var vvalue = (res.name+' '+res.value).replace(repl,'');
                for (var j=0;j<9;j++) {
                  res.slot = j;
                  reservations[julday].push({id: res.id, userid: res.userid, day: res.day, 
                                 slot: j, itemid: res.itemid, name:roomname , value:vvalue, eventtype:'hd' });
                }
              } else {
                reservations[julday].push(res);
              }
          }
          callback(reservations);
      });
}

var gettickets = function(user,query,callback) {
  // returns a hash of tickets for show
  // assumes you give it a callback that assigns the hash
  client.query(
      // fetch all shows
       'SELECT u.firstname,u.lastname,u.department,sho.name,ti.* from mdl_show_tickets ti inner join mdl_show sho '
       + 'on (sho.idx = ti.showid) inner join mdl_user u on (u.id = ti.userid)',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var tickets = {};
          for (var i=0,k= results.length; i < k; i++) {
              var tick = results[i];
              var julday = tick.jd;
              delete tick.jd;
              if (!tickets[julday]) {
                tickets[julday] = [];
              }
              tickets[julday].push(tick);
          }
          callback(tickets);
      });
}

var getshow = function(callback) {
  // returns a hash of all shows
  // assumes you give it a callback that assigns the hash
  client.query(
      // fetch all shows
       'SELECT * from mdl_show',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var showlist = {};
          for (var i=0,k= results.length; i < k; i++) {
              var show = results[i];
              var userid = show.userid;
              var aut = show.authlist.split(',');
              if (!showlist[userid]) {
                showlist[userid] = [];
              }
              showlist[userid].push(show);
              for (var au in aut) {
                autid = aut[au];
                if (!showlist[autid]) {
                  showlist[autid] = [];
                }
                showlist[autid].push(show);

              }
          }
          callback(showlist);
      });
}

var getAllTests = function(callback) {
  // returns a hash of all tests --- same as db.prover, 
  // used to populate db.prover
  // assumes you give it a callback that assigns the hash
  client.query(
      // fetch all tests
       'SELECT julday,shortname,cl.value, u.username FROM mdl_bookings_calendar cl '
       + '      INNER JOIN mdl_course c ON (c.id = cl.courseid) '
       + '      INNER JOIN mdl_user u ON (u.id = cl.userid) '
       + '      WHERE eventtype = "prove" and julday >= ' + db.firstweek + ' ORDER BY julday,value,shortname',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var prover = {};
          for (var i=0,k= results.length; i < k; i++) {
              var prove = results[i];
              var julday = prove.julday;
              delete prove.julday;   // save some space
              if (!prover[julday]) {
                prover[julday] = [];
              }
              prover[julday].push(prove);
          }
          callback(prover);
      });
}

var getTimetables = function(callback) {
  // fetch all timetable data
  // returns a hash { course: {"3inf5_3304":[ [1,2,"3inf5_3304","R210",'',654 ], ... ] , ... } , 
  //                  room:{ "r210":[ [1,2,"3inf5_3304",654 ..
  //                  group:{ "3304":[ [1,2,"3inf5_3304","r210",'',654], ..],  "3sta":[... ] ... }
  //                  teach:{ "654":[ [1,2,"3inf5_3304","r210",'',654], ..],  "1312":[... ] ... }
  //                }
  // the inner array is [day,slot,room,changed-room,teachid]
  // assumes you give it a callback that assigns the hash
  client.query(
      'select userid,cal.day,cal.slot,r.name as room,cal.name from mdl_bookings_calendar cal inner join mdl_bookings_item r '
       +     ' on cal.itemid = r. id where eventtype = "timetable" and julday = ? order by cal.name,day,slot', [ db.firstweek ],
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var coursetimetable = {};
          var roomtimetable = {};
          var grouptimetable = {};
          var teachtimetable = {};
          for (var i=0,k= results.length; i < k; i++) {
              var lesson = results[i];
              var course = lesson.name;
              var room = lesson.room;
              var elm = course.split('_');
              var fag = elm[0];
              var group = elm[1];
              var uid = lesson.userid;

              // indexd by teach id
              if (!teachtimetable[uid]) {
                teachtimetable[uid] = [];
              }
              teachtimetable[uid].push([lesson.day, lesson.slot, course, room, '',uid]);

              // indexed by group name
              if (!grouptimetable[group]) {
                grouptimetable[group] = [];
              }
              grouptimetable[group].push([lesson.day, lesson.slot, course, room,'', uid]);

              // indexed by room name
              if (!roomtimetable[room]) {
                roomtimetable[room] = [];
              }
              roomtimetable[room].push([lesson.day, lesson.slot, course, room,'', uid]);

              // indexed by coursename (course_group)
              if (!coursetimetable[course]) {
                coursetimetable[course] = [];
              }
              coursetimetable[course].push([lesson.day, lesson.slot, course, room,'', uid]);
          }
          //console.log(teachtimetable);
          callback( { course:coursetimetable, room:roomtimetable, group:grouptimetable, teach:teachtimetable  } );
      });
}

var getstudents = function() {
  // get some basic data from mysql
  // we want list of all users, list of all courses
  // list of all groups, list of all tests
  // list of all freedays, list of all bigtests (exams etc)
  // list of all rooms, array of coursenames (for autocomplete)
  client.query(
      // fetch students and teachers
      'SELECT id,username,firstname,lastname,department,institution,skype from mdl_user where'
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
}

var getcourses = function() {
  client.query(
      // fetch courses, groups and course:categories
      'select c.id,c.shortname,c.category,c.cost,count(ra.id) as cc from mdl_role_assignments ra inner join mdl_context x'
        + '  ON (x.id=ra.contextid and ra.roleid  = 5) inner join mdl_course c ON x.instanceid=c.id '
        + '                        group by c.id having cc > 2 order by cc',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var ghash = {}; // only push group once
          var courselist = []; 
          for (var i=0,k= results.length; i < k; i++) {
              var course = results[i];
              courselist.push(course.id);
              var elm = course.shortname.split('_');
              var cname = elm[0];
              var group = elm[1];
              db.course.push(cname);
              db.category[cname] = course.cost;
              if (!ghash[group]) {
                db.groups.push(group);
                ghash[group] = 1;
              }

              if (!db.grcourses[group]) {
                db.grcourses[group] = [];
              }
              db.grcourses[group].push(cname);

              if (!db.coursesgr[cname]) {
                db.coursesgr[cname] = [];
              }
              db.coursesgr[cname].push(group);
          }
          var str_courselist = courselist.join(',');
          client.query(
              // fetch memberlist for all courses
              'select c.id, c.shortname,ra.userid,ra.roleid as role from mdl_role_assignments ra inner join mdl_context x '
                   + ' ON (x.id=ra.contextid and ra.roleid in (3,5)) inner join '
                   + ' mdl_course c ON x.instanceid=c.id where c.id in ( ' + str_courselist + ' )',
              function (err, results, fields) {
                  if (err) {
                    console.log("ERROR: " + err.message);
                    throw err;
                  }
                  var blokkgr = {};
                  var blokkmem = {};  // used to prevent duplicates
                  for (var i=0,k=results.length; i<k; i++) {
                    var amem = results[i];
                    var elm = amem.shortname.split('_');
                    var cname = elm[0];
                    var group = elm[1];
                    // build group: studentlist
                      if (!db.memlist[group]) {
                        db.memlist[group] = [];
                        blokkmem[group] = {}
                      }
                      // only students in memlist
                      if (amem.role == 5 && ! blokkmem[group][amem.userid]) {
                        db.memlist[group].push(amem.userid);
                        blokkmem[group][amem.userid] = 1;
                      } 

                    // build courseteach
                    // and teachcourse
                      // only teachers in courseteach
                      if (amem.role == 3) {
                        if (!db.courseteach[amem.shortname]) {
                          db.courseteach[amem.shortname] = {teach:[],id:amem.id};
                        }
                        if (!db.teachcourse[amem.userid]) {
                          db.teachcourse[amem.userid] = [];
                        }
                        db.teachcourse[amem.userid].push(amem.shortname);
                        db.courseteach[amem.shortname].teach.push(amem.userid);
                      } 

                    // build person : grouplist
                      if (!db.memgr[amem.userid]) {
                        db.memgr[amem.userid] = [];
                        blokkgr[amem.userid] = {};
                      }
                      if (! blokkgr[amem.userid][group]) {
                        db.memgr[amem.userid].push(group);
                        blokkgr[amem.userid][group] = 1;
                    }
                  }
                  //console.log(db.memgr);
                  //console.log(db.memlist);
                  //console.log(db.courseteach);
              });
      });
}

var getfreedays = function(callback) {
  client.query(
      // fetch free-days
      'select * from mdl_bookings_calendar where eventtype="fridager"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          db.freedays = {};
          for (var i=0,k= results.length; i < k; i++) {
              var free = results[i];
              db.freedays[free.julday] = free.value;
          }
          //console.log("fetched freedays");
          if (callback) callback(db.freedays);
      });
}

var getyearplan = function(callback) {
  client.query(
      // fetch yearplan events
      'select id,julday,value from mdl_bookings_calendar where eventtype="aarsplan"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          db.yearplan = {};
          for (var i=0,k= results.length; i < k; i++) {
              var plan = results[i];
              if (!db.yearplan[Math.floor(plan.julday/7)]) {
                db.yearplan[Math.floor(plan.julday/7)] = { week:julian.week(plan.julday), pr:[], days:[] };
              }
              db.yearplan[Math.floor(plan.julday/7)].days[Math.floor(plan.julday%7)] =  plan.value;
          }
          if (callback) callback(db.yearplan);
          //console.log(db.yearplan);
      });
}

var getexams = function(callback) {
  client.query(
      // fetch big tests (exams and other big tests - they block a whold day )
      'select id,julday,name,value from mdl_bookings_calendar where eventtype="heldag"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          for (var i=0,k= results.length; i < k; i++) {
              var free = results[i];
              if (!db.heldag[free.julday]) {
                db.heldag[free.julday] = {};
              }
              db.heldag[free.julday][free.name.toUpperCase()] = free.value;
          }
          if (callback) callback(db.heldag);
          //console.log(db.heldag);
      });
}

var getroomids = function() {
  client.query(
      'select id,name from mdl_bookings_item where type="room"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          db.roomids   = {};
          db.roomnames = {};
          for (var i=0,k= results.length; i < k; i++) {
              var room = results[i];
              db.roomids[""+room.name] = ""+room.id;
              db.roomnames[room.id] = room.name;
          }
      });
}

var getBasicData = function(client) {
  // get some basic data from mysql
  // we want list of all users, list of all courses
  // list of all groups, list of all tests
  // list of all freedays, list of all bigtests (exams etc)
  // list of all rooms, array of coursenames (for autocomplete)
  getstudents();
  getcourses();
  getfreedays();
  getyearplan();
  getexams();
  getroomids();
};


module.exports.db = db;
module.exports.client = client;
module.exports.getAllTests = getAllTests;
module.exports.getstudents = getstudents;
module.exports.getcourses = getcourses;
module.exports.getfreedays = getfreedays;
module.exports.getyearplan = getyearplan;
module.exports.getexams = getexams;
module.exports.getReservations = getReservations;
module.exports.makereserv = makereserv;
module.exports.getTimetables = getTimetables;
module.exports.getCoursePlans = getCoursePlans;
module.exports.updateCoursePlan  = updateCoursePlan;
module.exports.updateTotCoursePlan = updateTotCoursePlan ;
module.exports.saveTest = saveTest;
module.exports.getBlocks = getBlocks;
module.exports.savesimple = savesimple;
module.exports.savehd = savehd;
module.exports.saveabsent = saveabsent;
module.exports.getabsent = getabsent;
module.exports.getshow = getshow;
module.exports.selltickets = selltickets ;
module.exports.gettickets = gettickets;
module.exports.saveTimetableSlot =  saveTimetableSlot ;
module.exports.getSomeData = getSomeData ;
