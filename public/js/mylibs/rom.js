// funksjoner for å vise romreservering


function rom_reservering(room,delta,makeres) {
    // vis timeplan for room med reserveringer
    // delta is offset from current day
    delta = typeof(delta) != 'undefined' ?  +delta : 0;
    makeres = typeof(makeres) != 'undefined' ?  makeres : true;
    var current = database.startjd+delta*7;
    var data = getRoomPlan(room);
    var plan = data.plan;
    var timetable = [ [],[],[],[],[],[],[] ];
    if (reservations) {
        for (var jd = current; jd < database.startjd+(1+delta)*7; jd++) {
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
                          timetable[res.day][res.slot] = '<div id="'+res.id
                              +'" class="edme rcorner gradbackgreen textcenter">' + res.value + '<div class="killer">x</div></div>';
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
      if (day == undefined) continue;
      var course = timeslot[2];
      var teach = teachers[timeslot[5]] || {username:"NN",firstname:"N",lastname:"N"};
      var teachname = teach.firstname + " " + teach.lastname;
      timetable[day][slot] = course + ' <span title="'+teachname+'">' + teach.firstname.substr(0,4) + teach.lastname.substr(0,4) + '</span>';
    }
    var s = '<div class="sized1 centered gradback">'
            + '<h1 id="oskrift"></h1>'
            + ((makeres) ?
             ( '<div id="makeres" class="sized25 textcenter centered" >'
            +   '<label><span id="info">Melding</span> :<input id="restext" type="text" /></label>'
            +   '<div id="saveres" class="button float gui" >Reserver</div>'
            + '</div><br>' )
            : '' )
            + '<table class="sized2 centered border1">'
            + '<caption class="retainer" ><div class="button blue" id="prv">&lt;</div>'
            + room 
            + '<div class="button blue "id="nxt">&gt;</div></caption>'
            + '<tr><th class="time">Time</th><th>Man</th><th>Tir</th><th>Ons</th>'
            + '<th>Tor</th><th>Fre</th></tr>';
    var numslots = 10;
    if (database.roomdata.roominfo[room]) {
      numslots = database.roomdata.roominfo[room].slots || 10;
    }
    for (i= 0; i < numslots; i++) {
      s += "<tr>";
      s += "<th>"+(i+1)+"</th>";
      for (j=0;j<5;j++) {
        var txt = timetable[j][i] || '<label> <input id="chk'+i+'_'+j+'" type="checkbox" />free</label>';
        if (database.freedays[current+j]) {
          txt = '<div class="timeplanfree">'+database.freedays[current+j]+'</div>';
        }
        s += '<td class="romres">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table></div>";
    $j("#main").html(s);
    $j("#oskrift").html('Uke '+julian.week(current)+' <span title="'+current+'" class="dato">'+show_date(current)+'</span>');
    $j("#saveres").click(function(event) {
        event.preventDefault();
        var mylist = $j("input:checked");
        var message = $j("#restext").val() || (userinfo.firstname.substr(0,4) + ' ' +userinfo.lastname.substr(0,4));
        var idlist = $j.map(mylist,function(e,i) { return e.id; }).join(',');
        $j("#info").html("Lagrer " + mylist.length);
        $j.post('/makereserv',{ current:current, room:room, myid:0, idlist:idlist, message:message, kill:false },function(resp) {
            $j.getJSON( "/reserv", 
                 function(data) {
                    reservations = data;
                    rom_reservering(room,delta);
                    if (resp.ok) {
                      $j("#info").html("Vellykket");
                    } else {
                      $j("#info").html(resp.msg);
                    }
            });
        });
    });
    $j(".killer").click(function(event) {
      event.stopPropagation()
      var myid = $j(this).parent().attr('id');
        $j.post('/makereserv',{ current:current, room:room, myid:myid, idlist:'0', message:"", kill:true },function(resp) {
          $j.getJSON( "/reserv", 
               function(data) {
                  reservations = data;
                  rom_reservering(room,delta);
                  if (resp.ok) {
                    $j("#info").html("Vellykket");
                  } else {
                    $j("#info").html(resp.msg);
                  }
          });
        });
      });

    $j(".edme").click(function() {
      $j("#info").html("edit "+this.id);
      });
    $j("#nxt").click(function() {
      if (database.startjd+7*delta < database.lastweek+7)
         rom_reservering(room,delta+1);
      });
    $j("#prv").click(function() {
      if (database.startjd+7*delta > database.firstweek-7)
         rom_reservering(room,delta-1);
      });

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
  // remove rooms from _possible_ that are not possible
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
