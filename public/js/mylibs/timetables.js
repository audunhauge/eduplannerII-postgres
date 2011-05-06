//show timetables

var tpath = '';  // path taken for this timeplan


function show_date(jd) {
  var startjd = 7 * Math.floor(jd  / 7);
  var startdate = julian.jdtogregorian(startjd);
  var enddate = julian.jdtogregorian(startjd+6);
  if (startdate.year == enddate.year) {
     var dato = "" + startdate.day + "." + startdate.month 
         + "-" + enddate.day + "." + enddate.month + " " + startdate.year;
  } else {
     var dato = "" + startdate.day + "." + startdate.month + "." + startdate.year + " - "
                + enddate.day + "." + enddate.month + "." + enddate.year;
  }
  return dato;
}

function show_thisweek(delta) {
    // viser denne uka, årsplanen + timeplan
    //var uid = userinfo.id;
    promises.toggle_year = function() { 
          show_thisweek(delta); 
        };
    delta = typeof(delta) != 'undefined' ?  +delta : 0;  // vis timeplan for en anne uke
    $j.bbq.pushState("#thisweek");
    var uid = database.userinfo.id || 0;
    var s='<div id="timeviser"><h1 id="oskrift">'+user+'</h1>';
    s+= '<div id="sectionimg"></div>';
    s+= '<div id="timeplan"></div>';
    s+= '<div id="workplan"></div>';
    s+= '<div id="weekly"></div>';
    s+= "</div>";
    $j("#main").html(s);
    if (showyear == 1) {
      $j("#timeplan").html('Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.');
      return;
    }
    // last inn årsplan-data for denne uka
    //var enr = uid
    var userlist = '';
    var e;
    var thisweek = database.startjd + delta*7;
    var dato = show_date(thisweek);
    s = getYearPlanThisWeek(thisweek);
    $j("#weekly").html(s);
    var planliste = '';
    var mos = 0;
    if (courseplans) {
      // courseplan.mos is the category that this user mos-tly belongs to
      // courseplan.plan is the workplan for this user
      var courseplan = addonCoursePlans(delta);
      mos = courseplan.mos;
      $j("#workplan").html(courseplan.plan);
    } else {
      if (!promises.allplans) promises.allplans = {};
      promises.allplans.thisweek = function() { var courseplan = addonCoursePlans(delta); $j("#workplan").html(courseplan.plan); };
        // promise to draw up workplan when we get it
    }
    if (timetables) {
      addonTimePlan(delta,mos);
      // addonTimePlan will update html for #timeplan (with bgimg given by mos)
    } else {
      if (!promises.timetables) promises.timetables = {};
      promises.timetables.thisweek = function() { addonTimePlan(delta,0); };
        // promise to draw up timetable when we get it
    }
}


function getYearPlanThisWeek(thisweek) {
  // fetch weekly summary from yearplan
    var s = '<table id="mytime" class="timeplan" >';
    var header = [];
    e = database.yearplan[Math.floor(thisweek/7)] || { days:[]} ;
    for (var j=0;j<6;j++) {
        header[j] = e.days[j] || '';
        var hd = database.heldag[thisweek+j];
        if (hd) {
          header[j] += '<ul class="hdliste">';
          for (var f in hd) {
            f = f.toUpperCase();
            var cat = +database.category[f] || 0
            header[j] += '<li class="catt'+cat+'">'+f+'&nbsp;'+hd[f]+'</li>';
          }
          header[j] += '</ul>';
        }
    }
    s += "<tr>";
    for (i=0;i<6;i++) {
        s += "<th>" + dager[i] + "</th>";
    }
    s += "</tr>";
    s += "<tr>";
    for (i=0;i<6;i++) {
        s += "<th class=\"dayinfo\">" + header[i] + "</th>";
    }
    s += "</tr></table>";
    return s;
}

function addonTimePlan(delta,mos) {
      var thisweek = database.startjd + delta*7;
      var uid = database.userinfo.id || 0;
      var userplan = getuserplan(uid);
      var s = vistimeplan(userplan,uid,'','isuser',delta);
      $j("#timeplan").html(s);
      $j("#sectionimg").addClass('sect'+mos);
      //$j(".totip").tooltip();
      $j(".totip").tooltip({position:"bottom right" } );
      $j(".goto").click(function() {
              var fagnavn = $j(this).attr("tag");
              var plandata = courseplans[fagnavn];
              visEnPlan(fagnavn,plandata);
          } );
      $j("#oskrift").html('Uke '+julian.week(thisweek)+' <span title="'+thisweek+'" class="dato">'+show_date(thisweek)+'</span>');
      $j("#nxt").click(function() {
          if (database.startjd+7*delta < database.lastweek+7)
            show_thisweek(delta+1);
          });
      $j("#prv").click(function() {
          if (database.startjd+7*delta > database.firstweek-7)
            show_thisweek(delta-1);
          });
}

function addonCoursePlans(delta) {
    var thisweek = database.startjd + delta*7;
    var uid = database.userinfo.id || 0;
    var planliste = '';
    var mos = 0;
    if (timetables && timetables.teach) {
      planliste = vis_fagplaner(uid,thisweek);
      var minefag = getfagliste(uid);
      var sect = "";
      var mostly = {0:0};
      for (var i in minefag) {
         var fag = minefag[i].split('_')[0];
         var cat = database.category[fag];
         if (!mostly[cat]) mostly[cat] = 0;
         mostly[cat]++;
         if (mostly[cat] >= mostly[mos]) mos = cat;
      }
    } 
    return {plan:planliste,mos:mos };
}




function build_timetable(timeplan,plan,filter,planspan) {
    // fills in a table with events from a plan
     var spanstart = typeof(planspan) != 'undefined' ? '<span class="'+planspan+'">' : '';
     var spanend   = typeof(planspan) != 'undefined' ? '</span>' : '';
     var spa,sto;
     var i,j,pt,room,cell;
     var clean = {};      // just coursename - no formating
     var cleanroom = {};  // just room names
     for (i=0; i< plan.length;i++) {
        spa = spanstart; sto = spanend;
        pt = plan[i];
        if (pt[2]) cell = pt[2].replace(' ','_');
        if (!timeplan[pt[1]]) {     // ingen rad definert ennå
            timeplan[pt[1]] = {};   // ny rad
            clean[pt[1]] = {};      // ny rad
            cleanroom[pt[1]] = {};  // ny rad
        }
        clean[pt[1]][pt[0]]     = cell;
        cleanroom[pt[1]][pt[0]] = pt[3];
        cell = '<span tag="'+cell+'" class="goto">'+cell+'</span>';
        if (!planspan && timeplan[pt[1]][pt[0]]) continue; // only add multiple if we have planspan
        if (!timeplan[pt[1]][pt[0]]) {    // no data assigned yet
           timeplan[pt[1]][pt[0]] = '';   // place empty string so we can += later
        }
        room = (pt[3] == 'nn') ? '' : pt[3];
        room = (pt[4] && filter != 'RAD' ) ? "&nbsp;<span class=\"rombytte\">=&gt;&nbsp;" + pt[4] + "</span>" : '&nbsp;'+room ;
        cell += room;
        if (plan.prover[ pt[1] ] && plan.prover[ pt[1] ] [ pt[0] ] ) {
          if (plan.prover[ pt[1] ] [ pt[0] ] != 1 ) {
              spa = '<span class="timeprove">';
              cell = plan.prover[ pt[1] ] [ pt[0] ];
              if ($j.isArray(cell)) {
                //cell = cell.join(' ');
                // this is a group - just assign subj+room
                cell = clean[pt[1]][pt[0]] + room;
              }
              cell = cell.replace('eksamen','eks');
              sto = '</span>';
          } else {
            if (spanstart) {
              spa = '<span class="'+planspan+' timeprove">';
            } else {
              spa = '<span class="timeprove">';
              sto = '</span>';
            }
          }
        }
        if (timeplan[pt[1]][pt[0]] == spa + cell + sto) continue;
        // don't add if we already have exact same data
        timeplan[pt[1]][pt[0]] += spa + cell + sto; 
     }
     return {timeplan:timeplan, clean:clean, cleanroom:cleanroom};
}


function makepop(cell,userlist,username,gruppe,filter,heading) {
    // lag en css:hover som viser elever i en gruppe
    // denne funksjonen er memoized - den husker på
    // elevlista for tuple (gruppe,username)
    if (popmemoizer[cell+gruppe+username]) {
        return popmemoizer[cell+gruppe+username];
    } 
    if (userlist) {
        var elev;
        var elist = [];
        if (heading) {
            elist.push(heading);
        }
        var ce;
        var glist;
        if (filter == 'group') {
            glist = memberlist[username];
        }
        for (var i=0; i< userlist.length;i++) {
            elev = id2elev[userlist[i]];
            if (elev && elev.department)  {
                if (filter == 'klasse' && username && elev.department && elev.department != username) continue;
                if (filter == 'group' && ($j.inArray(elev.id,glist) < 0) ) continue;
                elist.push(""+elev.firstname+" "+elev.lastname+" "+elev.department);
            }
        }
        ce = '<li><a href="#">'+cell+'</a><ul><li><a href="#">' 
            + elist.join('</a></li><li><a href="#">') 
            + '</a></li></ul></li>';
    } else {
        ce = '<li><a href="#">'+cell+'</a></li>';
    }
    popmemoizer[cell+gruppe+username] = ce;
    return ce;
}

function vis_samlingtimeplan() {
    var jd = database.startjd;
    var s="<div id=\"timeviser\"><h1>Sammensatt timeplan</h1>";
    s+=  '<p>Velg timeplaner fra de andre menyene (elev,lærer,klasse) og '
       + ' marker at du vil ha dem med i samlingen. Kom tilbake til denne sida'
       + ' for å se den samla timeplanen. (denne sida er ikke ferdig)</p>';
    var timeplan = {};
    var j=1;
    for (var i in timeregister) {
        timeplan = build_timetable(timeplan,timeregister[i],'','p'+j);
        j++;
    }
    s += build_plantable(jd,0,'sammensatt gruppe',timeplan,{});
    s += '</div>';
    $j("#main").html(s);
}


function getAbsentBecauseTest(jd,fagliste) {
  // given a list of courses
  // returns a list of absent students for given week
  var heldag = [];
  var hd = database.heldag[jd];
  for (fag in hd) {
    if ($j.inArray(fag.toUpperCase(),fagliste.fag) != -1) {
      heldag.push( { hd:fag+' '+hd[fag],elever:fagliste.fagelev[fag] } );
    }
  } 
  return heldag;
}        


function build_plantable(jd,uid,username,timeplan,xtraplan,filter) {
    // lager en html-tabell for timeplanen
    var absentDueTest = [];
      // absentDueTest[j][course] => absentlist
    var start = database.starttime;
    var members = username;

    var timetable = [ [],[],[],[],[],[],[] ];
    if (reservations) {
        for (var jdd = jd; jdd < jd+7; jdd++) {
            if (reservations[jdd]) {
                var reslist = reservations[jdd];
                for (var r in reslist) {
                    var res = reslist[r];
                    var teach = teachers[res.userid];
                    if (!timetable[res.day][res.slot]) {
                      timetable[res.day][res.slot] = {};
                    }
                    timetable[res.day][res.slot][res.name] = res;
                }
            }
        }
    }

    if (memberlist && memberlist[username]) {
        // this is a timetable for a group/class
        // show members as a list in caption (on hover)
        var userlist = memberlist[username];
        members = makepop(members,userlist,username,'','');
        members = '<ul id="members" class="gui nav">' + members + '</ul>';
    }
    var numslots = 10;
    if (database.roomdata.roominfo[uid]) {
      numslots = database.roomdata.roominfo[uid].slots || 10;
    }
    var i,j;
    var s = '<table class="timeplan">';
    members = '<div class="button blue" id="prv">&lt;</div>'+members+'<div class="button blue "id="nxt">&gt;</div>';
    s += '<caption><div style="position:relative;">Timeplan for '+members+"</div></caption>";
    s += "<tr><th>&nbsp;</th>";
    for (i=0;i<5;i++) {
        s += "<th>" + dager[i] + "</th>";
    }
    s += "</tr>";
    var cell,xcell,bad,subject;
    for (i=0; i<numslots; i++) {
       s+= "<tr>";
       s += "<td class=\"time\">"+start[i]+"</td>";
       for (j=0; j<5; j++) {
          cell = '&nbsp;';
          if (isadmin && filter == 'teach')  { 
              cell = '<div id="'+uid+'_'+j+"_"+i+'" class="edit">' + cell + '</div>';
          } 
          bad = '';         // used to mark bad data, xcell and cell should be exclusive
          xcell = '';
          subject = '';    // no students for this lesson
          var abslist = [];  // studs who are absent for this day-slot
          var header = 'AndreFag';
          var already = {};  // to avoid doubles
          var room = (timeplan.cleanroom[i]) ? timeplan.cleanroom[i][j] : '';
          if (timetable[j] && timetable[j][i] && timetable[j][i][room] && timetable[j][i][room].eventtype == 'hd') {
            // there is a reservation for this slot due to full day test
            cell = '<span class="hdrom">'+timetable[j][i][room].value+'</span>';
          } 
          if (timeplan.timeplan[i] && timeplan.timeplan[i][j]) {
            cell = (cell == '&nbsp;') ? timeplan.timeplan[i][j] : cell + timeplan.timeplan[i][j] ;
          }
          if (timetable[j] && timetable[j][i] && timetable[j][i][room] && timetable[j][i][room].eventtype == 'reservation') {
            // there is a reservation for this slot
            if (timetable[j][i][room].name != room) {  // change of room
              cell += '<span class="rombytte">'+timetable[j][i][room].name+'</span>';
            }
          } 
          if (timeplan.timeplan[i] && timeplan.timeplan[i][j]) {
             if (isadmin && filter == 'teach') cell = '<div id="'+uid+'_'+j+"_"+i+'" class="edit">' + cell + '</div>';
             if (filter == 'RAD') {
                if (cell.substr(0,4) != 'RADG') {
                    cell = '<span class="grey">'+cell+'</span>';
                }
             }
             bad = ' bad';
             header = 'x';
             subject = timeplan.clean[i][j].split('_')[1] || '';
             if (!absentDueTest[j]) 
               absentDueTest[j] = {}; 
             if (!absentDueTest[j][subject]) {
               var elever = memberlist[subject];
               var andre = getOtherCG(elever);
               absentDueTest[j][subject] = getAbsentBecauseTest(jd+j,andre);
             }
          }
          if (xtraplan[i] && xtraplan[i][j]) {
             var xp = xtraplan[i][j];
             if ($j.isArray(xp)) {
                xcell = xp.join('');
                if (xcell.indexOf('redfont') > 0) {
                    header = '<span class="pinkfont">'+header+'</span>';
                }
                xcell = '<ul class="nav'+bad+'"><li><a href="#">'+header+'</a><ul>' 
                       + xcell
                       + '</ul></li></ul>';
             } else {
               xcell = xp;
               cell = '';
             }
          }
          if (absentDueTest[j] && absentDueTest[j][subject] && absentDueTest[j][subject].length > 0) {
            for (var abs in absentDueTest[j][subject]) {
              for (var el in absentDueTest[j][subject][abs].elever) {
               var elev = absentDueTest[j][subject][abs].elever[el]; 
               if (students[elev] && !already[elev] ) {
                 already[elev] = 1;
                 abslist.push(short_sweet_name(elev));
                 //abslist.push( students[elev].firstname + '&nbsp;' + students[elev].lastname );
               }
              }
            }
          }
          if (absent[jd+j]) {
            if (absent[jd+j][uid]) {
              var ab = absent[jd+j][uid];
              var tlist = ab.value.split(',');
              if ($j.inArray(""+(i+1),tlist) >= 0) {
                xcell += '<div class="absent overabs">'+ab.name+'</div>';
              }
            }
            if (subject) {
              var elever = memberlist[subject];
              for (var el in elever) {
                  var ab = absent[jd+j];
                  var elev = elever[el];
                  if (ab[elev] && !already[elev] ) { // one of my studs is absent
                      var slots = ab[elev].value;
                      for (var sl in slots) {
                          var slo = slots[sl];
                          if (+slo-1 == i) {
                              // this stud is absent during course slot
                              //abslist.push( students[elev].firstname + '&nbsp;' + students[elev].lastname );
                              abslist.push(short_sweet_name(elev));
                              already[elev] = 1;
                              break;
                          }
                      }
                  }
              }
            }
          }
          if (database.freedays[jd+j]) {
              cell = '<div class="timeplanfree">'+database.freedays[jd+j]+'</div>';
              xcell = '';
          }
          var abs = '';
          if (timetables.teach[uid]) {
            if (abslist.length) {
              abs = '<div title="<table><tr><td>'
                      +abslist.join('</td></tr><tr><td>')+'</tr></table>" class="tinytiny totip absentia">'+abslist.length+'</div>';
            }
          }
          s += '<td><div class="retainer">' + cell + xcell + abs +'</div></td>';
       }
       s+= "</tr>";
    }
    s+= "</table>";
    return s;
}


function updateMemory() {
    if (! jQuery.isEmptyObject(timeregister)) {
        var s = '<ul id="memul">';
        for (var i in timeregister) {
            s += '<li>' + i + '</li>';
        }
        s += '</ul>';
        $j("#memlist").html(s);
    }
}


function vistimeplan(data,uid,filter,isuser,delta) {
  delta = typeof(delta) != 'undefined' ?  +delta : 0;  // vis timeplan for en anne uke
  // viser timeplan med gitt datasett
  var plan = data.plan;
  var timeplan = {};
  var xtraplan = {};
  var i,j;
  var cell,userlist,gruppe,popup,user,username;
  if (!plan) plan = {};
  var jd = database.startjd + 7*delta;
  plan.prover = add_tests(uid,jd);
  if (isuser != 'isuser' && memberlist[uid]) {
    // this is a group or class
    var elever = memberlist[uid];
    var andre = getOtherCG(elever); 
    plan.prover = grouptest(plan.prover, andre.gru, jd);
  }
  if (isuser != 'isuser' && timetables.room[uid]) {
    // this is a room
    xtraplan = getReservations(uid,delta);
  }
  valgtPlan = plan;        // husk denne slik at vi kan lagre i timeregister
  if (filter == 'group' || filter == 'room' || filter == 'klass' || filter == 'gr' || filter == 'fg') { 
    user = {firstname:uid,lastname:''};
  } else {
    user = (teachers[uid]) ?  teachers[uid] : (students[uid]) ? students[uid] : {firstname:uid,lastname:''};
  }
  var username = user.firstname + ' ' + user.lastname;
  // hent ut ekstraplanen - skal vises som css:hover
  if (data.xplan) {
     var xplan = data.xplan;
     for (i=0; i< xplan.length;i++) {
         var pt = xplan[i];
         // pt = [1,7,"1mt5_1st2","a002","",1361]
         var cell = pt[2].replace(' ','_');
         gruppe = cell.split('_')[1];
         // add in tests for group
         if (!xtraplan[pt[1]]) {
             xtraplan[pt[1]] = {};
         }
         if (!xtraplan[pt[1]][pt[0]]) xtraplan[pt[1]][pt[0]] = [];
         userlist = intersect(memberlist[gruppe],elever);
         if (plan.prover[pt[1]] && plan.prover[pt[1]][pt[0]]) {
             if ($j.inArray(gruppe,plan.prover[pt[1]][pt[0]]) != -1) {
               cell = '<span class="redfont">'+cell+'</span>';
             }
         }
         popup = makepop(cell,userlist,username,gruppe,filter);
         xtraplan[pt[1]][pt[0]].push(popup);
     }
  }
  // hent ut normalplanen - skal vises som ren text
  timeplan = build_timetable(timeplan,plan,filter);
  //var ss = build_plantable(jd,uid,username.trim(),timeplan,xtraplan,filter);
  var ss = build_plantable(jd,uid,$j.trim(username),timeplan,xtraplan,filter);
  return ss;
}


function intersect(a,b) {
  if (!b) return a;
  if (!a) return [];
  var inter = [];
  for (var i in a) {
    var elm = a[i];
    if ($j.inArray(elm,b) != -1) inter.push(elm);
  }
  return inter;
}

var deltamemory = 0;   // so that we can leaf thru timeplans for chosen week


function vis_timeplan_helper(userplan,uid,filter,isuser,visfagplan,delta) {
  // timeplanen er henta - skal bare vises
  visfagplan = typeof(visfagplan) != 'undefined' ? visfagplan : false;
  delta = typeof(delta) != 'undefined' ?  +delta : 0;  // vis timeplan for en anne uke
  deltamemory = delta;
  var current = database.startjd + 7*delta;
  s = vistimeplan(userplan,uid,filter,isuser,delta);
  if (visfagplan) {
    if (courseplans) {
      s += vis_fagplaner(uid,current);
    } else {
      if (!promises.allplans) promises.allplans = [];
      promises.allplans.timetable = function() { var courseplan = vis_fagplaner(uid,current); $j("#timeplan").append(courseplan); };
    }
  }
  $j("#timeplan").html(s);
  //console.log(tpath+uid);
  $j(".totip").tooltip({position:"bottom right" } );
  $j(".goto").click(function() {
            var fagnavn = $j(this).attr("tag");
            var plandata = courseplans[fagnavn];
            visEnPlan(fagnavn,plandata);
        } );

  $j("#oskrift").html('Uke '+julian.week(current)+' <span title="'+current+'" class="dato">'+show_date(current)+'</span>');
  $j('.edit').editable(save_timetable, {
       indicator : 'Saving...',
       tooltip   : 'Click to edit...',
       doformat  : translatebreaks,
       submit    : 'OK'
   });
  $j("#nxt").click(function() {
        if (database.startjd+7*delta < database.lastweek+7)
           vis_timeplan_helper(userplan,uid,filter,isuser,visfagplan,delta+1);
      });
  $j("#prv").click(function() {
        if (database.startjd+7*delta > database.firstweek+7)
           vis_timeplan_helper(userplan,uid,filter,isuser,visfagplan,delta-1);
      });
}



function vis_valgt_timeplan(user,filter,visfagplan,isuser) {
    // gitt en userid vil denne hente og vise en timeplan
    eier = user;
    // if user is name of klass or group then getcourseplan
    var userplan = (user.id) ? getuserplan(user.id) : getcourseplan(user,deltamemory) ;
    // rooms need delta cause they need to show reservations
    var uid = user.id || user;
    $j.bbq.pushState(tpath+uid);
    vis_timeplan_helper(userplan,uid,filter,isuser,visfagplan,deltamemory);
}


function save_timetable(val,opt) {
   if (isadmin) {
     var myid = $j(this).attr("id").split('_');
     var tid  = myid[0];
     var day  = myid[1];
     var slot = myid[2];
     $j.post( "/save_timetable", { "teachid":tid, "day":day, "slot":slot, "val":val },function(msg) {
           alert(msg);
         });
     // we now have the day and slot
   }
   return val;
}


function vis_timeplan(s,bru,filter,isuser) {
    // filter is used by vistimeplan to filter members of groups
    // so that when we look at a class - then we only see class members
    // in lists for other groups
    deltamemory = 0;
    s += setup_timeregister();
    s+= '<div id="timeplan"></div>';
    s+= "</div>";    // this div is set up in the calling function
    $j("#main").html(s);
    updateMemory();
    // legg denne planen i minne dersom bruker klikker på husk
    $j("#push").click(function() {
       if (valgtPlan) {
           addToMemory(valgtPlan);
           updateMemory();
       }
    });
    $j("#velgbruker").keyup(function() {
       var idx = $j("#velgbruker option:selected").val();
       vis_valgt_timeplan(bru[idx],filter,isuser,isuser);
    });
    $j("#velgbruker").change(function() {
       var idx = $j("#velgbruker option:selected").val();
       vis_valgt_timeplan(bru[idx],filter,isuser,isuser);
    });
}

function vis_gruppetimeplan() {
    var bru = database.groups;
    var ant = bru.length;
    var s="<div id=\"timeviser\"><h1>Gruppe-timeplaner</h1>";
    s+= '<div class="gui" id=\"velg\">Velg gruppen du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    var sorted = [];
    for (var i=0;i< ant; i++) {
       var e = bru[i], fagnavn = e;
       if ($j.inArray(e,database.classes) >= 0) continue;
       if (database.grcourses[e]) {
         var grc = database.grcourses[e];
         if (grc.length == 1) fagnavn = grc[0] + "_" + e;
         sorted.push({text:fagnavn,idx:i});
       }
    }
    sorted.sort(function (a,b) { return (a.text > b.text) ? 1 : -1 });
    for (var str in sorted) {
      var elm = sorted[str];
      s+= '<option value="'+elm.idx+'">' + elm.text  +  "</option>";
    }
    s+= "</select></div>";
    tpath = '#timeplan/group/';
    vis_timeplan(s,bru,'gr',false );
}

function vis_klassetimeplan() {
    var bru = database.classes;
    var ant = bru.length;
    var s='<div id="timeviser"><h1 id="oskrift">Klasse-timeplaner</h1>';
    s+= '<div class="gui" id=\"velg\">Velg klassen du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (i=0;i< ant; i++) {
       e = bru[i]; 
       s+= '<option value="'+i+'">' + e  +  "</option>";
    }
    s+= "</select></div>";
    tpath = '#timeplan/klass/';
    vis_timeplan(s,bru,'kl',false );
}

function vis_romtimeplan() {
    var bru = allrooms;
    var ant = bru.length;
    var s='<div id="timeviser"><h1 id="oskrift">Rom-timeplaner</h1>';
    s+= '<div class="gui" id=\"velg\">Velg rommet du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (var i in bru) {
       var e = bru[i]; 
       s+= '<option value="'+i+'">' + e  +  "</option>";
    }
    s+= "</select></div>";
    tpath = '#timeplan/room/';
    vis_timeplan(s,bru,'ro',false );
}

function vis_elevtimeplan() {
    var s='<div id="timeviser"><h1 id="oskrift">Elev-timeplaner</h1>';
    s+= '<div class="gui" id=\"velg\">Velg elev du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (var i in studentIds) {
       var idx = studentIds[i];  // stud-ids are in sorted order, students are ordered by id .. not so nice
       var e = students[idx]; 
       s+= '<option value="'+idx+'">' + e.department + " " + " " + e.institution+ " " + e.lastname + " " + e.firstname  +  "</option>";
    }
    s+= "</select></div>";
    tpath = '#timeplan/stud/';
    vis_timeplan(s,students,'non','isuser' );
}

function vis_teachtimeplan() {
    var s='<div id="timeviser"><h1 id="oskrift">Lærer-timeplaner</h1>';
    s+= '<div class="gui" id="velg">Velg lærer du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    $j.get('/getsql',{ sql:"select * from mdl_user", param:''}, function(data) {
          test = data;
        });
    var sorted = [];
    for (var i in teachers) {
       e = teachers[i]; 
       sorted.push({text:e.username + " " + e.lastname + " " + e.firstname, idx:i});
    }
    sorted.sort(function (a,b) { return (a.text > b.text) ? 1 : -1 });
    for (var str in sorted) {
      var elm = sorted[str];
      s+= '<option value="'+elm.idx+'">' + elm.text  +  "</option>";
    }
    s+= "</select></div>";
    tpath = '#timeplan/teach/';
    vis_timeplan(s,teachers,'teach','isuser' );
}

function getcourseplan(cgr,delta) {
  delta = typeof(delta) != 'undefined' ?  +delta : 0;  // vis timeplan for en anne uke
  // We want a timetable for a course/group/room
  // just try each in turn and return first found
  if (timetables && timetables.course[cgr]) {
    var elever = memberlist[cgr];
    var andre = getOtherCG(elever); 
    var xplan = [];
    for (gr in andre.gru) {
      // get timetables for all other groups for these studs
      xplan.push(timetables.group[gr]);
    }
    return {plan:timetables.course[cgr]};
  }
  if (timetables && timetables.group[cgr]) {
    var elever = memberlist[cgr];
    var andre = getOtherCG(elever); 
    var xplan = [];
    for (gri in andre.gru) {
      // get timetables for all other groups for these studs
      var gr = andre.gru[gri];
      if (gr == cgr) continue;  // ignore the original group
      xplan = xplan.concat(timetables.group[gr]);
    }
    return {xplan:xplan, plan:timetables.group[cgr]};
  }
  if (timetables.room[cgr]) {
    return {plan:timetables.room[cgr]};
  }
  return {plan:[]};
}

function getReservations(room,delta) {
    var reserved = [];
    if (reservations) {
        for (var jd = database.startjd+delta*7; jd < database.startjd+(1+delta)*7; jd++) {
            if (reservations[jd]) {
                var reslist = reservations[jd];
                for (var r in reslist) {
                    var res = reslist[r];
                    if (res.name == room) {
                        var teach = teachers[res.userid];
                        if (teach && teach.username == res.value) {
                            res.value = teach.firstname + " " + teach.lastname;
                        }
                        if (!reserved[res.slot]) reserved[res.slot] = [];
                        if (res.eventtype == 'hd') {
                          reserved[res.slot][res.day] = '<div class="rcorner gradbackred textcenter">' + res.value + '</div>';
                        } else if (database.userinfo.isadmin || res.userid == database.userinfo.id) {
                          reserved[res.slot][res.day] = '<div class="rcorner gradbackgreen textcenter">' + res.value + '</div>';
                        } else {
                          reserved[res.slot][res.day] = '<div class="rcorner gradbackgray textcenter">' + res.value + '</div>';
                        }
                    }
                }
            }
        }
    }
    return reserved;
}


function getOtherCG(studlist) {
  // given a list of students
  // returns other groups and courses that
  // are connected to these studs
    var fag = [];
    var gru = [];
    var fagelev = {};
    for (var eid in studlist) {
        var elev = studlist[eid];
        var egru = memgr[elev];
        for (var egid in egru) {
            var eg = egru[egid];
            if ($j.inArray(eg,gru) == -1) {
                gru.push(eg);
            }
            var fgru = database.grcourses[eg];
            for (var fid in fgru) {
              var efg = fgru[fid];
              if (!fagelev[efg]) fagelev[efg] = [];
              fagelev[efg].push(elev);
              if ($j.inArray(efg,fag) == -1) {
                  fag.push(efg);
              }
            }
        }
    }
    return {fag:fag, gru:gru, fagelev:fagelev };
}    

function getuserplan(uid) {
  // assume timetables is valid
  // use memgr to pick out all groups
  // build up a timetable from timetables for each group
  if (timetables && timetables.teach[uid]) {
    // we have a teach - just pick out timetable.
    return {plan:timetables.teach[uid]};
  } else {
    var usergr = memgr[uid] || null;
    if (usergr) {
      var myplan = [];
      for (var i in usergr) {
        var group = usergr[i];
        for (var j in timetables.group[group]) {
          myplan.push(timetables.group[group][j]);
        }
      }
      return { plan:myplan };
    } 
  }
  return [];
}

function coursetests(coursename,jd) {  
  // returns list of tests for given course
  // { jdmonday:[{day:0..4, slots:"1,2,3"}]  }
  // the key is jd for monday each week with test, value is list of tests {day,slots}
  var prover = {};
  for (jd= database.firstweek; jd < database.lastweek; jd += 7) {
    for (var day = 0; day<5; day++) {
      // database.heldag[i]
      if (alleprover[jd + day]) {
        for (var pr in alleprover[jd + day]) {
          var pro = alleprover[jd + day][pr];
          if (coursename != pro.shortname) continue;
          if (!prover[jd]) {
            prover[jd] = [];
          }
          prover[jd].push( { day:day, slots:pro.value } );
        }
      }
    }
  }
  return prover;
}


function grouptest(prover,grouplist,jd) {  
  // updates table of tests for given grouplist, given jd
  // assumes jd is monday of desired week
  for (var day = 0; day<5; day++) {
    if (alleprover[jd + day]) {
      for (var pr in alleprover[jd + day]) {
        var pro = alleprover[jd + day][pr];
        var coursename = pro.shortname;
        var ccgg = coursename.split('_');
        var cc = ccgg[0], gg = ccgg[1];
        //if (group != gg) continue;
        if ($j.inArray(gg,grouplist) == -1) continue;
        var elm = pro.value.split(',');  // get the slots for this test
        for (var k in elm) {
          var slot = +elm[k]-1;
          if (slot < 0) slot = 0;
          if (!prover[slot]) {    // ingen rad definert ennå
              prover[slot] = {};  // ny rad
          }
          if (!prover[slot][day]) {    // mangler kolonne
              prover[slot][day] = [];  // ny kolonne
          }
          prover[slot][day].push(gg);
        }
      }
    }
  }
  return prover;
}


function add_tests(uid,jd) {  
  // returns table of tests for uid for given week
  // assumes jd is monday of desired week
  var prover = {};
  if (uid.length) return prover;  // this is not a user id (most likely a course/group)
  var mysubj = getUserSubj(uid);  // list of courses - groups for this stud
  prover.tests = {};   // store info about test indexed by jd for next 4 weeks
  var faggrupper = getUserSubj(uid);
  for (var day = 0; day<28; day++) {
    if (!timetables.teach[uid]) {
      var hd =  database.heldag[jd+day] || {} ;
      for (fag in hd) {
          if (faggrupper[fag]) {
            prover.tests[jd+day] = { shortname:fag,value:hd[fag] };
            for (var dd=0; dd < 9; dd++) {
              if (!prover[dd]) {    // ingen rad definert ennå
                  prover[dd] = {};  // ny rad
              }
              var hdf = hd[fag].replace('heldag','hd').replace('hovedmål','hm').replace('sidemål','sm');
              prover[dd][day] = fag + ' ' + hdf;
            }
          }
      } 
    }
    if (alleprover[jd + day]) {
      for (var pr in alleprover[jd + day]) {
        var pro = alleprover[jd + day][pr];
        var coursename = pro.shortname;
        var ccgg = coursename.split('_');
        var cc = ccgg[0], gg = ccgg[1];
        if (!(mysubj[coursename] || mysubj[cc] && mysubj[gg])) continue;
        prover.tests[jd+day] = pro;      // used in show_next4 to mark days with tests
        if (day > 4) continue;
        // build timetable for this week
        var elm = pro.value.split(',');  // get the slots for this test
        for (var k in elm) {
          var slot = +elm[k]-1;
          if (!prover[slot]) {    // ingen rad definert ennå
              prover[slot] = {};  // ny rad
          }
          prover[slot][day] = 1;
        }
      }
    }
  }
  return prover;
}


function setup_timeregister() {
    // tegner gui for timeplan-minne
    var s = '<div id="push" class="button posbut gui">husk</div>';
    s += '<div id="minne" class="memory gui"><h4>Minne</h4><div id="memlist"></div></div>';
    return s;
}



function addToMemory() {
    // legger til en ny bruker til minnet
    if (valgtPlan && eier && eier.username) {
        var username = eier.username;
        if (!timeregister[username]) {
           timeregister[username] = valgtPlan;
        }
    }
}

