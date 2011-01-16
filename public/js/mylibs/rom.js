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
    // we have a teach - just pick out timetable.
    return {plan:timetables.room[room]};
  } 
  return [];
}
