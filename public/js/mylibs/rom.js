// funksjoner for å vise romreservering


function rom_reservering(room) {
    // vis timeplan for room med reserveringer
    var data = getRoomPlan(room);
    var plan = data.plan;
    var timetable = [ [],[],[],[],[],[],[] ];
    if (reservations) {
        for (var jd = database.startjd; jd < database.startjd+7; jd++) {
            if (reservations[jd]) {
                var reslist = reservations[jd];
                for (var r in reslist) {
                    var res = reslist[r];
                    if (res.name == room) {
                        var teach = teachers[res.userid];
                        if (teach && teach.username == res.value) {
                            res.value = teach.firstname + " " + teach.lastname;
                        }
                        if (database.userinfo.isadmin || res.userid == database.userinfo.id) {
                          timetable[res.day][res.slot] = '<div class="rcorner gradbackgreen textcenter">' + res.value + '</div>';
                        } else {
                          timetable[res.day][res.slot] = '<div class="rcorner gradbackgray textcenter">' + res.value + '</div>';
                        }
                    }
                }
            }
        }
    }
    for (var i in plan) {
      var timeslot = plan[i];
      var day = timeslot[0];
      var slot = timeslot[1];
      var course = timeslot[2];
      var teach = teachers[timeslot[5]] || {username:"NN",firstname:"N",lastname:"N"};
      var teachname = teach.firstname + " " + teach.lastname;
      timetable[day][slot] = course + ' <span title="'+teachname+'">' + teach.firstname.substr(0,4) + teach.lastname.substr(0,4) + '</span>';
    }
    var s = '<div class="sized1 centered gradback">'
            + '<table class="sized2 centered border1">'
            + '<caption>' + room + '</caption>'
            + '<tr><th class="time">Time</th><th>Man</th><th>Tir</th><th>Ons</th>'
            + '<th>Tor</th><th>Fre</th></tr>';
    for (i= 0; i < 15; i++) {
      s += "<tr>";
      s += "<th>"+i+"</th>";
      for (j=0;j<5;j++) {
        var txt = timetable[j][i] || '<label> <input type="checkbox" />free</label>';
        s += '<td class="romres">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table></div>";
    $j("#main").html(s);
}


function getRoomPlan(room) {
  // assume timetables is valid
  if (timetables.room[room]) {
    return {plan:timetables.room[room]};
  } 
  return [];
}

var possible = [];  // list of all possible rooms given constraints
var checkdlist = {};  // these are slots that are checked

function findfree() {
    // search for a free room
    // user checks of slots and is shown a list of rooms that are free
    if (!timetables.room) return;

    checkdlist = {};  // these are slots that are checked
    possible = [];
    for (var i in linktilrom) {
      var r = linktilrom[i];
      possible.push(r);
    }
    // compare these to timetables for all rooms to find free rooms

    var timetable = [ [],[],[],[],[],[],[] ];
    var reservtable = [];
    if (reservations) {
        for (var jd = database.startjd; jd < database.startjd+7; jd++) {
            if (reservations[jd]) {
                var reslist = reservations[jd];
                reservtable.push(reslist);
            }
        }
    }
    var s = '<div class="sized1 centered gradback">'
            + '<table class="sized2 centered border1">'
            + '<caption>Ledig rom</caption>'
            + '<tr><th class="time">Time</th><th>Man</th><th>Tir</th><th>Ons</th>'
            + '<th>Tor</th><th>Fre</th></tr>';
    for (i= 0; i < 15; i++) {
      s += "<tr>";
      s += "<th>"+i+"</th>";
      for (j=0;j<5;j++) {
        var idd = "" + j + "-" + i;
        var txt = '<label> <input class="free" id="' + idd + '" type="checkbox" />free</label>';
        s += '<td class="romres">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table></div>";
    s += '<p /><div id="posslist" class="gradback centered sized2 textcenter"></div>';
    $j("#main").html(s);
    showposs(possible);
    $j(".free").click( function() {
          var myid = $j(this).attr("id");
          if ($j(this).attr("checked")) {
            var elms = myid.split('-');
            var day = elms[0]; var slot = elms[1];
            possible = crosscheck(possible,reservtable, day,slot);
            checkdlist[myid] = [day,slot];
          } else {
            delete checkdlist[myid];
            possible = [];
            for (var i in linktilrom) {
              var r = linktilrom[i];
              possible.push(r);
            }
            for (var iid in checkdlist) {
              var day = checkdlist[iid][0]; var slot = checkdlist[iid][1];
              possible = crosscheck(possible,reservtable, day,slot);
            }
          }
          showposs(possible);
        });
}

function crosscheck(possible,reserv,day,slot) {
  // remove rooms from possible that arn't possible
  var reduced = [];
  outerloop:
  for (var i in possible) {
    var r = possible[i];
    var romt = timetables.room[r] || [];
    for (var dsi in romt) {
      var elm = romt[dsi];
      if (elm[0] == day && elm[1] == slot) 
         continue outerloop;
    }
    for (var rr in reserv[day]) {
      var res = reserv[rr];
      for (var rrd in res) {
        var rre = res[rrd];
        if (rre.day == day && rre.name == r && rre.slot == slot) 
           continue outerloop;
      }
    }
    reduced.push(r);
  }
  return reduced;
}    

function showposs(possible) {
  var s = '';   
  for (var rid in possible) {
    s += '<span class="rlinks" id="' + possible[rid] + '">' + possible[rid] + '</span> ';
  }
  $j("#posslist").html(s);
  $j(".rlinks").click( function () {
          var myid = $j(this).attr("id");
          rom_reservering(myid);
      });
}    
