/*
 * Scan thru an export file from NOVA Schem and load in data
 * First pick up timeslots (start-time for lessons)
 *   create a function for finding timeslot for bad start-times
 *   some slot-assignments don't follow the slots - force them into nearest
 * Next pick up all rooms, create a hash roomname -> id  for later use
 * Make a list of all subjects (but dont insert them yet - wait till we have
 * courses also.
 * Pick up all teachers and insert them first as users, (id > 10000,
 * department= Undervisning
 * Pick up all studs, use same id as in novaschem (assumed  < 10000)
 *   but only insert a student when we have a group assignment (later for groups)
 * Pick up groups, insert them, get memberlist and then insert all studs who
 * are members - then insert into members
 * Finally read slot-assignments (teach,day,slot,room,group,subject)
 * and create subjects courses (teachers timetable) in that order
 *
*/

var pg = require('pg');
var sys = require('sys');
var connectionString = "postgres://admin:123simple@localhost/planner";
fs = require('fs');
var client;
var after = function(callback) {
    return function(err, queryResult) {
      if(err) {
        console.log("Error! " + sys.inspect(err));
      }
      callback(queryResult)
    }
  }
pg.connect(connectionString, after(function(cli) {
    client = cli;
    console.log("connected");
    slurp(client);
  }));


function slurp(client) {
fs.readFile('berit_utf8.txt', 'utf8',function (err, data) {
  if (err) throw err;
  var lines = data.split('\n');
  var i = 0;
  var l = lines.length;
  while (i < l) {
    var line = lines[i];

    if ( line.substr(0,8) == 'STANDARD' ) {
      i++;
      var slots = {};
      var elm = line.split('\t');
      var starttimes = elm[2].split(', ');
      for (var si in starttimes) {
        var sta = starttimes[si];
        slots[sta] =  +si;
      }
      // slots is a converter from start-time to slot number for timetable
      var time2slot = function(t) {
        if (slots[t] != undefined) return slots[t];
        var ret = 0;
        var telm = t.split(':');
        var th = +telm[0];
        var tm = +telm[1] || 0;
        for (var slo in slots) {
            ret = slots[slo];
            var selm = slo.split(':');
            var sh = +selm[0];
            var sm = +selm[1];
            if (sh > th) break;
            if (Math.abs((sh*60+sm) - (th*60+tm)) <= 20) break;
        }
        if (th > sh) {  // we have gone beyond the table
            if (((th*60+tm) - (sh*60+sm)) > 40) {
                ret = ret + Math.floor(((th*60+tm) - (sh*60+sm))/40);
            }
        }
        return ret;
      };
    }

    if ( line.substr(0,11) == 'Room (6601)' ) {
      i++;
      var rooms = [ "(1,'nn')" ];
      var roomid = 2;
      var roomtab = { 'nn':1 };
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        if (elm[0] == '0') continue;
        if (elm[0] == '001') continue;
        rooms.push("( "+roomid+",'"+elm[0]+"')");
        roomtab[elm[0]] = roomid;
        // so that we can get id from room-name later in script without a query
        roomid++;
      } while (i < l )
      var roomlist = rooms.join(',');
      client.query(
      'insert into room (id,name) values '+ roomlist,
            after(function(results) {
                console.log('ROOMS INSERTED');
      }));
      
    }

    if ( line.substr(0,14) == 'Subject (6401)' ) {
      i++;
      var subjects = [];
      var subjid = 1;
      var subjtab = {};
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        subjects.push("("+subjid+",'"+elm[0]+"','"+elm[3]+"')");
        subjtab[elm[0]] = subjid;
        subjid++;
      } while (i < l )
      var subjectlist = subjects.join(',');
      //console.log('insert into subject (subjectname,description) values '+ subjectlist);
      
    }
    if ( line.substr(0,14) == 'Teacher (6001)' ) {
      i++;
      var teachers = [];
      var teachid = 10000;
      var teachtab = {};  // translate init4 to id
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        var firstname = elm[6].toLowerCase();
        var lastname = elm[4].toLowerCase();
        teachers.push("( " + teachid + ", '"+elm[0]+"','"+elm[0]+"','"+firstname+"','"+lastname+"','"+elm[8]+"','Undervisning' )");
        teachtab[elm[0]] = teachid;
        teachid++;
      } while (i < l )
      // init4,lastname,firstname,tlf,epost
      //console.log(teachers);
      var teachlist = teachers.join(',');
      //console.log('insert into users (id,username,password,firstname,lastname,email) values '+ teachlist);
      client.query(
      'insert into users (id,username,password,firstname,lastname,email,department) values '+ teachlist,
            after(function(results) {
                console.log('TEACHERS INSERTED');
      }));
      
    }
    
    var students = [];
    if ( line.substr(0,14) == 'Student (7201)' ) {
      i++;
      var aspirants = {};
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        var firstname = elm[4].toLowerCase();
        var lastname = elm[3].toLowerCase();
        aspirants[ elm[0] ] = "("+elm[0]+", '"+elm[0]+"','"+elm[0]+"','"+firstname+"','"+lastname+"','"+elm[5]+"','Student' )";
        // aspirants will only be added as studs if they are assigned to at least one group
      } while (i < l )
      
    }

    if ( line.substr(0,12) == 'Group (6201)' ) {
      i++;
      var groups = [];
      var groupmem = {};  // hash of groupname:[ members ... ]
      var grouptab = {};  // group name to grid
      var grid = 100;
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        groups.push("("+grid+",'"+elm[0]+"' )");
        groupmem[grid] = elm[5];
        grouptab[elm[0]] = grid;
        grid++;
      } while (i < l )
      var grouplist = groups.join(',');
      client.query( 'insert into groups (id,groupname) values '+ grouplist,
             after(function(results) {
                console.log('GROUPS INSERTED');
      }));
      var memberlist = [];
      for (var gr in groupmem) {
              if (groupmem[gr] == '') continue;
              var mem = groupmem[gr].split(',');
              for (var mi in mem) {
                  var memid = mem[mi];
                  if (aspirants[memid]) {
                      // we have a student who is a member of a group
                      students.push(aspirants[memid]);
                      delete aspirants[memid];
                  }
                  memberlist.push( "("+memid+","+gr+")" );
              }
      }
      memberlistvalues = memberlist.join(',');
      var studlist = students.join(',');
      client.query(
        'insert into users (id,username,password,firstname,lastname,email,department) values '+ studlist,
          after(function(results) {
              console.log('STUDENTS INSERTED');
              client.query( 'insert into members (userid,groupid) values ' + memberlistvalues,
                after(function(results) {
                    console.log("ADDED MEMBERS");
              }));
      }));
      
    }
    
    if ( line.substr(0,9) == 'PK (7100)' ) {
      i++;
      var timetable = {}
      var courses = {};   // create a course for each unique subject_group
      var enrol = [];     // enrol groups in courses
      var courselist = [];
      var teachlist = [];
      var ttlist = [];
      var cid = 1;
      do {
        line = lines[i];
        i++;
        if (line == '') break;
        var elm = line.split('\t');
        var day=elm[2],start=elm[3],dur=elm[4],subj=elm[6],teach=elm[7],group=elm[8],room=elm[9];
        var slot = time2slot(start);
        //if (slot == '' || slot == undefined) continue;
        if (day == '') continue;
        if (teach == '') continue;
        var subj_group = subj + '_' + group;
        if (!courses[subj_group]) {
            courses[subj_group] = [cid,teach,group,room];
            var subjid = subjtab[subj];
            courselist.push( "("+cid+",'"+subj_group+"','"+subj_group+"',"+subjid+")" );
            var grid = grouptab[group]; 
            if (grid) {
              enrol.push( "("+cid+","+grid+")" );
            }
            var telm = teach.split(',');
            for (var tt in telm) {
                var tti = telm[tt];
                var tid = teachtab[tti];
                if (tid) {
                  teachlist.push( "("+cid+","+tid+")" );
                }
            }
            cid++;
        }
        var mycid = courses[subj_group][0];
        var telm = teach.split(',');
        if (telm.length > 1) console.log("2 teachers ",teach,dur,day,slot,subj,group,room);
        for (var tt in telm) {
            var midura = dur;
            var mislot = slot;
            var tti = telm[tt];
            var tid = teachtab[tti];
            if (tid) {
                if (!timetable[tti]) timetable[tti] = {};
                if (!timetable[tti][day]) timetable[tti][day] = {};
                do {
                    if (timetable[tti][day][mislot]) {
                        console.log("double booking for ",tti,day,mislot,subj,group,room);
                    } else {
                        timetable[tti][day][mislot] =  [subj,group,room] ;
                        var rid = roomtab[room] || 1;
                        ttlist.push( "(1,"+tid+","+rid+","+mycid+",'timetable',"+day+","+mislot+",'"+subj_group+"','"+room+"')" );
                    }
                    midura -= 40;
                    mislot++;
                } while (midura > 0);
            }
        }


        //console.log(i,"  day="+day,"start="+start,"slot="+slot,"dur="+dur,"subj="+subj,"teach="+teach,"group="+group,"room="+room);
      } while (i < l )
      var courselistvalues = courselist.join(',');
      var enrolvalues = enrol.join(',');
      var teachvalues = teachlist.join(',');
      var calendarvalues = ttlist.join(',');
      console.log("starting to insert subjects");
      client.query(
      'insert into subject (id,subjectname,description) values '+ subjectlist,
            after(function(results) {
                console.log('SUBJECTS INSERTED');
                client.query( 'insert into course (id,shortname,fullname,subjectid) values '+ courselistvalues,
                         after(function(results) {
                            console.log('COURSES INSERTED');
                            client.query( 'insert into enrol (courseid,groupid) values '+ enrolvalues,
                                     after(function(results) {
                                        console.log('COURSES ENROLLED');
                                 }));
                            //console.log( 'insert into teacher (courseid,userid) values '+ teachvalues);
                            client.query( 'insert into teacher (courseid,userid) values '+ teachvalues,
                                     after(function(results) {
                                        console.log('TEACHERS ASSIGNED');
                                 }));
                            //console.log( 'insert into calendar (julday,teachid,roomid,courseid,eventtype,day,slot,name,value) values '+ calendarvalues);
                            //*
                            client.query( 'insert into calendar (julday,teachid,roomid,courseid,eventtype,day,slot,name,value) values '+ calendarvalues,
                                     after(function(results) {
                                        console.log('TIMETABLES ELEVATED');
                                 }));
                                 //*/
                     }));
      }));
      
    }

    i++;
  }
});
}
