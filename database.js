var Client = require('mysql').Client;
var client = new Client();
var creds = require('./creds');
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
  ,memlist     : {}    // hash of { "3304":[234,45,454],"2303":[23, ...], ... }  -- group -> studs
  ,courseteach : {}    // hash of { "3inf5_3304":[654],"2inf5":[654,1363]," ... }  -- group -> teachers
  ,grcourses   : {}    // hash of { "3304":[ "3inf5" ] , ... }  -- courses connected to a group
  ,coursesgr   : {}    // hash of { "3inf5":[ "3304" ] , ... }  -- groups connected to a course
  ,memgr       : {}    // hash of { 234:["3304","2303","3sta" ..], ... }  --- groups stud is member of
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
// info about this week
db.startjd = 7 * Math.floor(julian.greg2jul(month,day,year ) / 7);
db.startdate = julian.jdtogregorian(db.startjd);
db.enddate = julian.jdtogregorian(db.startjd+6);
db.week = julian.week(db.startjd);


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

var getAllTests = function(callback) {
  // returns a hash of all tests --- same as db.prover, 
  // used to populate db.prover
  // assumes you give it a callback that assigns the hash
  client.query(
      // fetch all tests
       'SELECT julday,shortname,cl.value, u.username FROM mdl_bookings_calendar cl '
       + '      INNER JOIN mdl_course c ON (c.id = cl.courseid) '
       + '      INNER JOIN mdl_user u ON (u.id = cl.userid) '
       + '      WHERE eventtype = "prove" and julday >= ' + db.startjd + ' ORDER BY julday,value,shortname',
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
  // returns a hash { course: {"3inf5_3304":[ [1,2,"R210" ], ... ] , ... } , 
  //                  room:{ "r210":[ [1,2,"3inf5_3304" ..
  //                  group:{ "3304":[ [1,2,"3inf5_3304","r210"], ..],  "3sta":[... ] ... }
  //                }
  // the inner array is [day,slot,room]
  // assumes you give it a callback that assigns the hash
  client.query(
      'select userid,cal.day,cal.slot,r.name as room,cal.name from mdl_bookings_calendar cal inner join mdl_bookings_item r '
       +     ' on cal.itemid = r. id where eventtype = "timetable" order by cal.name,day,slot',
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
              teachtimetable[uid].push([lesson.day, lesson.slot, course, room]);

              // indexed by group name
              if (!grouptimetable[group]) {
                grouptimetable[group] = [];
              }
              grouptimetable[group].push([lesson.day, lesson.slot, course, room]);

              // indexed by room name
              if (!roomtimetable[room]) {
                roomtimetable[room] = [];
              }
              roomtimetable[room].push([lesson.day, lesson.slot, course, room]);

              // indexed by coursename (course_group)
              if (!coursetimetable[course]) {
                coursetimetable[course] = [];
              }
              coursetimetable[course].push([lesson.day, lesson.slot, course, room]);
          }
          console.log(teachtimetable);
          callback( { course:coursetimetable, room:roomtimetable, group:grouptimetable, teach:teachtimetable  } );
      });
}

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
              db.category[cname] = course.category;
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
              'select c.shortname,ra.userid,ra.roleid as role from mdl_role_assignments ra inner join mdl_context x '
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
                      if (!db.courseteach[group]) {
                        db.courseteach[group] = [];
                      }
                      // only teachers in courseteach
                      if (amem.role == 3) {
                        db.courseteach[group].push(amem.userid);
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
  client.query(
      // fetch free-days
      'select * from mdl_bookings_calendar where eventtype="fridager"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          for (var i=0,k= results.length; i < k; i++) {
              var free = results[i];
              db.freedays[free.julday] = free.value;
          }
      });
  client.query(
      // fetch free-days
      'select id,julday,value from mdl_bookings_calendar where eventtype="aarsplan"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          for (var i=0,k= results.length; i < k; i++) {
              var plan = results[i];
              if (!db.yearplan[Math.floor(plan.julday/7)]) {
                db.yearplan[Math.floor(plan.julday/7)] = { week:julian.week(plan.julday), pr:[], days:[] };
              }
              db.yearplan[Math.floor(plan.julday/7)].days[Math.floor(plan.julday%7)] =  plan.value;
          }
          //console.log(db.yearplan);
      });
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
              db.heldag[free.julday][free.name] = free.value;
          }
          //console.log(db.heldag);
      });
};


module.exports.db = db;
module.exports.client = client;
module.exports.getAllTests = getAllTests;
module.exports.getTimetables = getTimetables;
