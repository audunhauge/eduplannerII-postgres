var pg = require('pg');
var sys = require('sys');
var connectionString = "postgres://admin:123simple@localhost/planner";

var lev    = require('./levenshtein');

var after = function(callback) {
    return function(err, queryResult) {
      if(err) {
        console.log("Error! " + sys.inspect(err));
      }
      callback(queryResult)
    }
  }
  

var julian = require('./julian');

var db = {
   studentIds  : []    // array of students ids [ 2343,4567 ]
  ,students    : {}    // hash of student objects {  2343:{username,firstname,lastname,institution,department} , ... ]
  ,teachIds    : []    // array of teacher ids [ 654,1493 ... ]
  ,teachers    : {}    // hash of teach objects { 654:{username,firstname,lastname,institution}, ... }
  ,course      : [ '3TY5','3SP35' ]    // array of coursenames [ '1MAP5', '3INF5' ... ] - used by autocomplete
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
  ,category    : { '3TY5':1,'3SP35':1 }    // hash of coursename:category { '3inf5':4 , '1nat5':2 ... }
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

var client;
pg.connect(connectionString, after(function(cli) {
    client = cli;
    console.log("connected");
    getBasicData(client);
  }));


var getCoursePlans = function(callback) {
        console.log("getCoursePlans");
        //console.log(client);
  client.query(
            'SELECT u.id, u.username, c.id as cid, u.institution '
          + ' ,c.shortname,w.sequence as section,w.plantext as summary '
          + '   FROM users u  '
          + '        INNER JOIN plan p ON (p.userid = u.id) '
          + '        INNER JOIN course c ON (c.planid = p.id) '
          + '        INNER JOIN weekplan w ON (p.id = w.planid) '
          + " WHERE u.department = 'undervisning' order by w.sequence ",
          //+ '   ORDER BY u.institution,u.username,c.shortname,w.sequence ' ,
      after(function(results) {
          console.log("came here allplans");
          var fliste = {}; 
          var compliance = {};  // is this a compliant teacher?
          var startdate   = 0;
          var numsections = 0;
          var prevsum = '';  // used to calc lev distance
          for (var i=0,k= results.rows.length; i < k; i++) {
            fag = result.rowss[i];
            summary = (fag.summary) ? fag.summary : '';
            summary = summary.replace("\n",'<br>');
            summary = summary.replace("\r",'<br>');
            section = (fag.section) ? fag.section : '0';
            shortname = fag.shortname;
            username = fag.username;
            institution = fag.institution;
            //if (startdate == 0) startdate = fag.startdate;
            //if (numsections == 0) numsections = fag.numsections;
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
      }));
}

var updateTotCoursePlan = function(query,callback) {
  // update courseplan - multiple sections
  var updated = query.alltext.split('z|z');
  var usects = {};
  for (var uid in updated) {
      var u = updated[uid];
      var elm = u.split('x|x');
      var sectnum = elm[0],text=elm[1];
      text = text.replace(/&amp;nbsp;/g,' ');
      text = text.replace(/&nbsp;/g,' ');
      text = text.replace(/\n/g,'<br>');
      usects[+sectnum] = text;
  }
  var ok = true;
  var msg = '';
  var param;
  var sql;
  if (query.planid) {
    sql = 'select w.*,p.id as pid from plan p inner join weekplan w on (p.id = w.planid) '
        + ' where p.id = $1 '; 
    param = query.planid;
  } else {
    sql = 'select w.*,p.id as pid from plan p inner join weekplan w on (p.id = w.planid) '
        + ' inner join course c on (c.planid = p.id) '
        + ' where c.id = $1 '; 
    param = query.courseid;
  }
  client.query( sql , [ param ] ,
      after(function(results) {
          var planid = 0;
          var sections = (results) ? results.rows : [] ;
          for (var sid in sections) {
              var s = sections[sid];
              if (planid == 0) planid = s.pid
              if (usects[s.sequence]) {
                  if (usects[s.sequence] != s.plantext) {
                      // there is an update for this section and it differs from dbase
                      // we must update this section
                      client.query(
                          'update weekplan set plantext=$1 where id=$2',[ usects[s.sequence], s.id ],
                          after(function(results) {
                          }));
                  }
              }
          }
          callback( { ok:ok, msg:msg } );
      }));
}

var saveabsent = function(user,query,callback) {
  // update/insert absent list
  var idd  = query.jd.substr(3);
  var jd = idd.split('_')[0];
  var day = idd.split('_')[1];
  var text = query.value;
  var name = query.name;
  var userid = query.userid;
  var klass = query.klass;   // this will be userid or 0
  console.log("Saving:",jd,text,name,userid,klass);
  if (text == '') client.query(
          'delete from calendar'
      + " where name = $1 and ($2 or (class=$3 or class=0 ) and userid= $4) and eventtype='absent' and julday= $5 " , [ name,user.isadmin,klass,userid, jd ],
          after(function(results) {
              callback( {ok:true, msg:"deleted"} );
          }));
  else client.query(
        'select * from calendar '
      + ' where name = $1 and (class=$2 or class=0) and eventtype=\'absent\' and userid= $3 and julday= $4 ' , [ name,klass, userid,  jd ],
      after(function(results) {
          var abs ;
          if (results) abs = results.rows[0];
          if (abs) {
              if (abs.value != text || abs.name != name) {
              client.query(
                  'update calendar set class=$1, name=$2,value=$3 where id=$4',[ klass,name,text, abs.id ],
                  after(function(results) {
                      callback( {ok:true, msg:"updated"} );
                  }));
              } else {
                callback( {ok:true, msg:"unchanged"} );
              }
          } else {
            client.query(
                'insert into calendar (courseid,userid,julday,eventtype,value,name,class) values (0,$1,$2,\'absent\',$3,$4,$5)',[userid,jd,text,name,klass],
                after(function(results) {
                    callback( {ok:true, msg:"inserted"} );
                }));
          }
      }));
}

var getabsent = function(callback) {
  // returns a hash of all absent teach/stud
  //  {  julday:{ uid:{value:"1,2",name:"Kurs"}, uid:"1,2,3,4,5,6,7,8,9", ... }
  client.query(
      'select id,userid,julday,name,value,class as klass from calendar where eventtype = "absent" and julday >= ?',[ db.startjd ],
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
          'delete from calendar'
      + ' where eventtype=? and julday= ? ' , [ eventtype, jd ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          });
  else client.query(
        'select * from calendar '
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
                  'update calendar set value=? where id=?',[ text, free.id ],
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
            console.log( 'insert into calendar (courseid,userid,julday,eventtype,value) values (0,2,?,?,?)',[jd,eventtype,text]);
            client.query(
                'insert into calendar (courseid,userid,julday,eventtype,value) values (0,2,?,?,?)',[jd,eventtype,text],
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
          'delete from calendar'
      + ' where day = ? and slot = ? and userid = ? and eventtype="timetable" ' , [ courseid,  user.id, julday ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          }); */
  } else client.query(
        'select * from calendar '
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
                  'update calendar set value=?,name=? where id=?',[ value,value, time.id ],
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
                'insert into calendar (courseid,userid,julday,eventtype,value) values (?,?,?,"prove",?)',[courseid, user.id, julday,tlist],
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

var saveVurd = function(query,callback) {
  var pid = query.planid
  var value = query.value;
  console.log( 'update plan set vurdering = ? where id= ? ', value,pid);
  client.query(
      'update plan set vurdering = ? where id= ? ', [value,pid],
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          callback( {ok:true, msg:"updated"} );
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
          'delete from calendar'
      + " where courseid = ? and userid = ? and eventtype='prove' and julday= ? " , [ courseid,  user.id, julday ],
          function (err, results, fields) {
              if (err) {
                  callback( { ok:false, msg:err.message } );
                  return;
              }
              callback( {ok:true, msg:"deleted"} );
          });
  else client.query(
        'select * from calendar '
      + " where courseid = ? and userid = ? and eventtype='prove' and julday= ? " , [ courseid,  user.id, julday ],
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
                  'update calendar set value=? where id=?',[ tlist, test.id ],
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
                'insert into calendar (courseid,userid,julday,eventtype,value) values (?,?,?,"prove",?)',[courseid, user.id, julday,tlist],
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

var saveblokk = function(user,query,callback) {
    console.log(query,user.id);
    var jd = query.myid;
    var val = query.value;
    var blokk = query.blokk;
    var kill = query.kill;
    if (kill) {
      console.log('delete from calendar where eventtype="blokk" and name="'+blokk+'" and julday='+jd);
    }
    client.query( 'delete from calendar'
      + ' where eventtype="blokk" and name=? and julday= ? ' , [ blokk , jd ],
          function (err, results, fields) {
              if (err) {
                  console.log(err.message);
                  callback( { ok:false, msg:err.message } );
                  return;
              }
          });
    if (kill)  {
       console.log("deleted an entry");
       callback( {ok:true, msg:"deleted"} );
       return;
    }
    client.query(
        'insert into calendar (julday,name,value,roomid,courseid,userid,eventtype)'
        + ' values (?,?,?,0,3745,2,"blokk")' , [jd,blokk,val],
        function (err, results, fields) {
            if (err) {
                callback( { ok:false, msg:err.message } );
                return;
            }
            callback( {ok:true, msg:"inserted"} );
        });
}

var savehd = function(user,query,callback) {
    console.log(query,user.id);
    var jd = query.myid;
    var val = query.value;
    var fag = query.fag;
    var klass = query.klass || 0;  // save whole day test as half day test if != 0
    var kill = query.kill;
    var pid = query.pid;
    if (kill) {
      var elm = pid.split('_');
      fag = elm[1];
      jd = elm[0].substr(2);
      console.log(fag,jd);
      console.log("delete from calendar where eventtype='heldag' and name='"+fag+"' and julday="+jd);
    }
    client.query( 'delete from calendar'
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
        'insert into calendar (julday,name,value,roomid,courseid,userid,eventtype,class)'
        + " values (?,?,?,?,3745,2,'heldag',?)" , [jd,fag,val,itemid,klass],
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
    //console.log('insert into show_tickets (showid,showtime,price,kk,ant,saletime,jd,userid) values ' + values);
    client.query(
        'insert into show_tickets (showid,showtime,price,kk,ant,saletime,jd,userid) values ' + values,
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
  var param;
  var sql;
  if (query.planid) {
    sql = 'select w.*,p.id as pid from plan p inner join weekplan w on (p.id = w.planid) '
        + ' where p.id = ? '; 
    param = query.planid;
  } else {
    sql = 'select w.*,p.id as pid from plan p inner join weekplan w on (p.id = w.planid) '
        + ' inner join course c on (c.planid = p.id) '
        + ' where c.id = ? '; 
    param = query.courseid;
  }

  client.query( sql , [ param ],
      function (err, results, fields) {
          if (err) {
              callback( { ok:false, msg:err.message } );
              return;
          }
          var planid = 0;
          var wanted = null;
          for (var si in results) {
            var sect = results[si];
            if (planid == 0) planid = sect.pid;
            if (sect.sequence == query.section) {
              wanted = sect;
              break;
            }
          }
          if (wanted) {
            if (wanted.plantext != query.summary) {
              client.query(
                  'update weekplan set plantext=? where id=?',[ query.summary, wanted.id ],
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
                'insert into weekplan (planid,sequence,plantext) values ('+planid+','+query.section+',"'+query.summary+'")',
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

var modifyPlan = function(user,query,callback) {
  // create/modify/delete a plan
  if (!user || user.department != 'Undervisning' ) {
    callback("not allowed");
    return;
  }
  var operation = query.operation;
  var pname    = query.pname    || 'newplan';
  var start    = query.start    || db.firstweek;
  var end      = query.stop     || db.lastweek;
  var subject  = query.subject  || pname;
  var courseid = query.courseid || 0;
  var category = query.category || 0;
  var state    = query.state    || 0;
  var planid   = query.planid   || 0;
  var connect  = query.connect  || '';
  switch(operation) {
    case 'newplan':
      client.query(
      'insert into plan (name,start,end,subject,courseid,userid,category,state) values (?,?,?,?,?,?,?,?) '
      , [pname,start,end,subject,courseid,user.id,category,state ],
      function (err, info) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var pid = info.insertId;
          // now we create empty week slots for this plan
          var val = [];
          for (var i=0; i < 48; i++) {
            val.push('("",'+pid+','+i+')');
          }
          client.query( 'insert into weekplan (plantext,planid,sequence) values ' + val.join(','),
          function (err, info) {
              if (err) {
                  console.log("ERROR: " + err.message);
                  throw err;
              }
          });
          callback("inserted");
      });
      break;
    case 'connect':
          if (connect) {
            //cidlist = connect.split(',');
            //console.log('update course set planid = '+planid+' where id in ('+connect+')');
            //*
            client.query(
            'update course set planid = ? where id in ('+connect+')' , [planid ],
            function (err, info) {
                if (err) {
                    console.log("ERROR: " + err.message);
                    throw err;
                }
                callback("connected");
            });
            // */
          }
      break;
    case 'disconnect':
          // disconnect a course from this plan
          callback("disconnected");
      break;
    case 'editplan':
          // change name, subject, year
            client.query(
            'update plan set start = ?,name=?,subject=? where id = ?' , [start,pname,subject,planid ],
            function (err, info) {
                if (err) {
                    console.log("ERROR: " + err.message);
                    throw err;
                }
                callback("edited");
            });
      break;
    case 'delete':
      console.log("deleting ",planid);
      client.query(
      'delete from plan where id=? '
      , [planid ],
      function (err, info) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          client.query( 'delete from weekplan where planid=?', [ planid ] ,
          function (err, info) {
              if (err) {
                  console.log("ERROR: " + err.message);
                  throw err;
              }
              callback("deleted");
          });
      });
      break;
  }
}

var getAplan = function(planid,callback) {
  // returns a specific plan
  client.query(
      'select p.*,w.id as wid, w.sequence, w.plantext from plan p  '
      + ' inner join weekplan w on (w.planid = p.id) '
      + ' where p.id = ? ' , [planid ],
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var plan = {};
          if (results[0]) { 
            plan.name = results[0].name;
            plan.weeks = {};
            for (var i=0;i<48;i++) plan.weeks[''+i] = '';
            for (var i=0,k= results.length; i < k; i++) {
              fag = results[i];
              summary = fag.plantext || '';
              summary = summary.replace(/\n/g,'<br>');
              summary = summary.replace(/\r/g,'<br>');
              section = fag.sequence || '0';
              shortname = fag.shortname;
              plan.weeks[section] = summary;
            }
          }
          callback(plan);
      });
}

var getAttend = function(user,params,callback) {
  // returns a hash of attendance
  console.log("getAttend");
  var uid = user.id || 0;
  var all = params.all || false;
  if (all) { client.query(
      'select * from starbreg order by julday ' ,
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var studs={}, daycount = {}, rooms={}, teach={}, klass={};
          for (var i=0,k= results.length; i < k; i++) {
            var att = results[i];
            var stu = db.students[att.userid];

            if (!studs[att.userid]) {
              studs[att.userid] = {};
            }
            studs[att.userid][att.julday] = [att.teachid, att.room ];

            if (!daycount[att.julday]) {
              daycount[att.julday] = 0;
            }
            daycount[att.julday]++; 

            // count pr klass
            if (stu && stu.department) {
                if (!klass[stu.department]) {
                  klass[stu.department] = {};
                }
                if (!klass[stu.department][att.julday]) {
                  klass[stu.department][att.julday] = 0;
                }
                klass[stu.department][att.julday]++;
            }

            if (!rooms[att.room]) {
              rooms[att.room] = {};
            }
            if (!rooms[att.room][att.julday]) {
              rooms[att.room][att.julday] = [];
              rooms[att.room][att.julday].teach = att.teachid;
            }
            rooms[att.room][att.julday].push(att.userid);

            if (!teach[att.teachid]) {
              teach[att.teachid] = {};
            }
            if (!teach[att.teachid][att.julday]) {
              teach[att.teachid][att.julday] = att.room;
            }

          }
          db.daycount = daycount;
          callback( { studs:studs, daycount:daycount, rooms:rooms, teach:teach, klass:klass } );
      });
  } else client.query(
      'select s.*, i.name from starbreg s inner join room i '
      + ' on (s.room = i.id) where userid=? order by julday ' ,[uid ],
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          callback(results);
      });
}

var getAllPlans = function(state,callback) {
  // returns a hash of all info for all plans
  // 0 == active plans
  // 1 == new plans (editing mode)
  // 2 == oldplans - for copying
  console.log("getAllPlans");
  client.query(
        'select p.*,c.shortname from plan p left outer join course c '
      + ' on (c.planid = p.id) where p.state = $1 order by name',[ state ],
      after(function(results) {
        if (results) {
          callback(results.rows);
        } else {
          callback(null);
        }
      }));
}

var getMyPlans = function(user,callback) {
  // returns a hash of all plans owned by user
  client.query(
      'select p.*, c.id as cid, c.shortname from plan p  '
      // + ' inner join weekplan w on (w.planid = p.id) '
      + ' left outer join course c on (c.planid = p.id) '
      + ' where p.userid = ? ' , [user.id ],
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
      'select id,julday,name,value from calendar where value != " " and eventtype = "blokk" ',
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
        sqlrunner('delete from calendar where eventtype="reservation" and id=? and userid=? ',[myid,user.id],callback);
        break;
      case 'update':
        console.log( 'update calendar set value = '+message+'where id='+myid+' and ('+user.isadmin+' or userid='+user.id+')' );
        sqlrunner( 'update calendar set value = ? where eventtype="reservation" and id=? and (? or userid=?) ',
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
        console.log( 'insert into calendar (eventtype,courseid,userid,julday,day,slot,roomid,name,value) values ' + values);
        client.query(
          'insert into calendar (eventtype,courseid,userid,julday,day,slot,roomid,name,value) values ' + values,
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
      'select id,userid,day,slot,roomid,name,value,julday,eventtype from calendar cal '
       + "      WHERE roomid > 0 and eventtype in ('heldag', 'reservation') and julday >= " + db.startjd ,
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
                var roomname = db.roomnames[res.roomid];
                var repl = new RegExp(",? *"+roomname);
                var vvalue = (res.name+' '+res.value).replace(repl,'');
                for (var j=0;j<9;j++) {
                  res.slot = j;
                  reservations[julday].push({id: res.id, userid: res.userid, day: res.day, 
                                 slot: j, itemid: res.roomid, name:roomname , value:vvalue, eventtype:'hd' });
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
       'SELECT u.firstname,u.lastname,u.department,sho.name,ti.* from show_tickets ti inner join show sho '
       + 'on (sho.idx = ti.showid) inner join users u on (u.id = ti.userid)',
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
       'SELECT * from show',
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
       'SELECT julday,shortname,cl.value, u.username FROM calendar cl '
       + '      INNER JOIN course c ON (c.id = cl.courseid) '
       + '      INNER JOIN users u ON (u.id = cl.userid) '
       + "      WHERE eventtype = 'prove' and julday >= " + db.firstweek + ' ORDER BY julday,value,shortname',
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
      "select userid,cal.day,cal.slot,r.name as room,cal.name from calendar cal inner join room r "
       +     " on cal.roomid = r. id where eventtype = 'timetable' and julday = $1 order by cal.name,day,slot", [ db.firstweek ],
      after(function(results) {
          var coursetimetable = {};
          var roomtimetable = {};
          var grouptimetable = {};
          var teachtimetable = {};
          for (var i=0,k= results.rows.length; i < k; i++) {
              var lesson = results.rows[i];
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
      }));
}

var getstudents = function() {
  // get some basic data from mysql
  // we want list of all users, list of all courses
  // list of all groups, list of all tests
  // list of all freedays, list of all bigtests (exams etc)
  // list of all rooms, array of coursenames (for autocomplete)
  client.query(
      // fetch students and teachers
      'SELECT id,username,firstname,lastname,department,institution from users order by department,institution,lastname,firstname',
            after(function(results) {
            //console.log(results.rows);
            for (var i=0,k= results.rows.length; i < k; i++) {
                var user = results.rows[i];
                if (user.department == 'Undervisning') {
                  db.teachIds.push(user.id);
                  db.teachers[user.id] = user;
                } else {
                  db.studentIds.push(user.id);
                  db.students[user.id] = user;
                }
            }
      }));
}

var getcourses = function() {
  client.query(
      // fetch courses, groups and course:catoegories
      'select c.id,c.shortname,c.category,me.groupid, count(me.id) as cc from course c inner join enrol en on (en.courseid=c.id) '
      + ' inner join members me on (me.groupid = en.groupid) group by c.id,c.shortname,c.category,me.groupid having count(me.id) > 1 order by count(me.id)',
      after(function (results) {
          //console.log(results.rows);
          var ghash = {}; // only push group once
          var courselist = []; 
          for (var i=0,k= results.rows.length; i < k; i++) {
              var course = results.rows[i];
              //if (course.cc <1) continue;
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
          //('select c.id, c.shortname,en.userid,en.roleid as role from course c inner join enrol en on (c.id = en.courseid) where c.id in ( ' + str_courselist + ' )');
          client.query(
              // fetch memberlist for all courses
              //'select c.id, c.shortname,en.userid,en.roleid as role from course c inner join enrol en on (c.id = en.courseid) where c.id in ( ' + str_courselist + ' )',
              'select c.id,c.shortname,me.userid from course c inner join enrol en on (en.courseid=c.id) '
              + ' inner join members me on (me.groupid = en.groupid) group by c.id,c.shortname,me.userid ',
              after( function (results) {
                  var blokkgr = {};
                  var blokkmem = {};  // used to prevent duplicates
                  for (var i=0,k=results.rows.length; i<k; i++) {
                    var amem = results.rows[i];
                    var elm = amem.shortname.split('_');
                    var cname = elm[0];
                    var group = elm[1];
                    // build group: studentlist
                      if (!db.memlist[group]) {
                        db.memlist[group] = [];
                        blokkmem[group] = {}
                      }
                      // only students in memlist
                      if (!blokkmem[group][amem.userid]) {
                        db.memlist[group].push(amem.userid);
                        blokkmem[group][amem.userid] = 1;
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
                  client.query(
                      'select c.id,c.shortname,t.userid from teacher t inner join course c on (c.id = t.courseid)',
                      after( function (results) {
                          // build courseteach
                          // and teachcourse
                          for (var i=0,k=results.rows.length; i<k; i++) {
                                var amem = results.rows[i];
                                var elm = amem.shortname.split('_');
                                var cname = elm[0];
                                var group = elm[1];
                                if (!db.courseteach[amem.shortname]) {
                                  db.courseteach[amem.shortname] = {teach:[],id:amem.id};
                                }
                                if (!db.teachcourse[amem.userid]) {
                                  db.teachcourse[amem.userid] = [];
                                }
                                db.teachcourse[amem.userid].push(amem.shortname);
                                db.courseteach[amem.shortname].teach.push(amem.userid);

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
                      }));
              }));
      }));
}

var getfreedays = function(callback) {
  client.query(
      // fetch free-days
      "select * from calendar where eventtype='fridager'",
      after(function(results) {
          db.freedays = {};
          if (results) {
            for (var i=0,k= results.rows.length; i < k; i++) {
              var free = results.rows[i];
              db.freedays[free.julday] = free.value;
            }
          }
          //console.log("fetched freedays");
          if (callback) callback(db.freedays);
      }));
}

var getyearplan = function(callback) {
  client.query(
      // fetch yearplan events
      "select id,julday,value from calendar where eventtype='aarsplan'",
      after(function(results) {
          db.yearplan = {};
          if (results) {
          for (var i=0,k= results.rows.length; i < k; i++) {
              var plan = results.rows[i];
              if (!db.yearplan[Math.floor(plan.julday/7)]) {
                db.yearplan[Math.floor(plan.julday/7)] = { week:julian.week(plan.julday), pr:[], days:[] };
              }
              db.yearplan[Math.floor(plan.julday/7)].days[Math.floor(plan.julday%7)] =  plan.value;
          }
          }
          if (callback) callback(db.yearplan);
          //console.log(db.yearplan);
      }));
}

var getexams = function(callback) {
  client.query(
      // fetch big tests (exams and other big tests - they block a whold day )
      "select id,julday,name,value,class from calendar where eventtype='heldag'",
      after(function(results) {
          if (results) {
          for (var i=0,k= results.rows.length; i < k; i++) {
              var free = results.rows[i];
              if (!db.heldag[free.julday]) {
                db.heldag[free.julday] = {};
              }
              db.heldag[free.julday][free.name.toUpperCase()] = { value:free.value, klass:free.class };
          }
          }
          if (callback) callback(db.heldag);
          //console.log(db.heldag);
      }));
}

var getroomids = function() {
  client.query(
      "select id,name from room ",
      after(function(results) {
          db.roomids   = {};
          db.roomnames = {};
          if (results) {
          for (var i=0,k= results.rows.length; i < k; i++) {
              var room = results.rows[i];
              db.roomids[""+room.name] = ""+room.id;
              db.roomnames[room.id] = room.name;
          }
          }
      }));
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
module.exports.getAttend = getAttend;
module.exports.saveblokk = saveblokk; 
module.exports.saveVurd = saveVurd;
module.exports.getMyPlans = getMyPlans;
module.exports.saveabsent = saveabsent;
module.exports.getabsent = getabsent;
module.exports.getshow = getshow;
module.exports.getAplan = getAplan;
module.exports.getAllPlans = getAllPlans;
module.exports.modifyPlan = modifyPlan;
module.exports.selltickets = selltickets ;
module.exports.gettickets = gettickets;
module.exports.saveTimetableSlot =  saveTimetableSlot ;
module.exports.getSomeData = getSomeData ;
