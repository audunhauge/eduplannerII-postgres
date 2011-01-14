// funksjoner for å vise romreservering


function rom_reservering(room) {
    // vis timeplan for room med reserveringer
    var data = getRoomPlan(room);
    var plan = data.plan;
    var timetable = [ [],[],[],[],[],[],[] ];
    for (var i in plan) {
      var timeslot = plan[i];
      var day = timeslot[0];
      var slot = timeslot[1];
      var course = timeslot[2];
      var teach = teachers[timeslot[4]] || {username:"NN",firstname:"N",lastname:"N"};
      timetable[day][slot] = course + " " + teach.username;
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
        var txt = timetable[j][i] || '&nbsp;';
        s += '<td class="">' + txt + "</td>";
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
