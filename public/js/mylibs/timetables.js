//show timetables
function show_thisweek() {
    // viser denne uka, årsplanen + timeplan
    //var uid = userinfo.id;
    var uid = database.userinfo.id || 0;
    var s='<div id="timeviser"><h1>'+user+'</h1>';
    s+= '<div id="timeplan"></div>';
    s+= "</div>";
    $j("#main").html(s);
    // last inn årsplan-data for denne uka
    //var enr = uid
    var userlist = '';
    var e;
    var events = database.aarsplan;
    var thisweek = database.startjd;
    if (database.startdate.year = database.enddate.year) {
        var dato = "" + database.startdate.day + "." + database.startdate.month 
            + "-" + database.enddate.day + "." + database.enddate.month + " " + database.startdate.year;
    } else {
        var dato = "" + database.startdate.day + "." + database.startdate.month + "." + database.startdate.year + " - "
                  + database.enddate.day + "." + database.enddate.month + "." + database.enddate.year;
    }
    s = '<table class="timeplan" >';
    var header = [];
    e = database.yearplan[Math.floor(thisweek/7)] || {} ;
    s += "<caption>Uke "+e.week+" "+dato+" Julday:"+thisweek+"</caption>";
    for (var j=0;j<6;j++) {
        header[j] = e.days[j] || '';
    }
    s += "<tr>";
    for (i=0;i<5;i++) {
        s += "<th>" + dager[i] + "</th>";
    }
    s += "</tr>";
    s += "<tr>";
    for (i=0;i<5;i++) {
        s += "<th class=\"dayinfo\">" + header[i] + "</th>";
    }
    s += "</tr></table>";
    $j("#timeplan").html(s);
    if (timetables.course) {
        var userplan = getuserplan(uid);
        s = vistimeplan(userplan,uid,'');
        $j("#timeplan").append(s);
    } else $j.getJSON( "/timetables", 
        function(data) {
            timetables = data;
            var userplan = getuserplan(uid);
            s = vistimeplan(userplan,uid,'');
            $j("#timeplan").append(s);
            updateFagplanMenu();
        });
}


function build_timetable(timeplan,plan,filter,planspan) {
    // fills in a table with events from a plan
     var spanstart = typeof(planspan) != 'undefined' ? '<span class="'+planspan+'">' : '';
     var spanend   = typeof(planspan) != 'undefined' ? '</span>' : '';
     var spa,sto;
     var i,j,pt,room,cell;
     for (i=0; i< plan.length;i++) {
        spa = spanstart; sto = spanend;
        pt = plan[i];
        cell = pt[2].replace(' ','_');
        if (!timeplan[pt[1]]) {    // ingen rad definert ennå
            timeplan[pt[1]] = {};  // ny rad
        }
        if (timeplan[pt[1]][pt[0]]) {  // vi har allerede lagra et fag
            continue;                  // ungår dobbeltfag
        }
        if (plan.prover[ pt[1] ] && plan.prover[ pt[1] ] [ pt[0] ] ) {
          if (spanstart) {
            spa = '<span class="'+planspan+' timeprove">';
          } else {
            spa = '<span class="timeprove">';
            sto = '</span>';
          }
        }
        room = (pt[4] && filter != 'RAD' ) ? "&nbsp;<span class=\"rombytte\">=&gt;&nbsp;" + pt[4] + "</span>" : '&nbsp;'+pt[3] ;
        cell += room;

        timeplan[pt[1]][pt[0]] = spa + cell + sto; 
     }
     return timeplan;
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
    s += build_plantable('sammensatt gruppe',timeplan,{});
    s += '</div>';
    $j("#main").html(s);
}


function build_plantable(username,timeplan,xtraplan,filter) {
    // lager en html-tabell for timeplanen
    var start = database.starttime;
    var members = username;
    if (filter == 'group') {
        members = fullname[username] + " " + username;
    }
    if (memberlist && memberlist[username]) {
        // this is a timetable for a group/class
        // show members as a list in caption (on hover)
        var userlist = memberlist[username];
        members = makepop(members,userlist,username,'','');
        members = '<ul id="members" class="gui nav">' + members + '</ul>';
    }
    var i,j;
    var s = '<table class="timeplan">';
    s += "<caption>Timeplan for "+members+"</caption>";
    s += "<tr><th>&nbsp;</th>";
    for (i=0;i<5;i++) {
        s += "<th>" + dager[i] + "</th>";
    }
    s += "</tr>";
    var cell,xcell,bad;
    for (i=0; i<10; i++) {
       s+= "<tr>";
       s += "<td class=\"time\">"+start[i]+"</td>";
       for (j=0; j<5; j++) {
          cell = '&nbsp;';
          bad = '';         // used to mark bad data, xcell and cell should be exclusive
          xcell = '';
          var header = 'AndreFag';
          if (timeplan[i] && timeplan[i][j]) {
             cell = timeplan[i][j];
             if (filter == 'RAD') {
                if (cell.substr(0,4) != 'RADG') {
                    cell = '<span class="grey">'+cell+'</span>';
                }
             }
             bad = ' bad';
             header = 'x';
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
             }
          }
          s += "<td>" + cell + xcell + "</td>";
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


function vistimeplan(data,uid,filter) {
     // viser timeplan med gitt datasett
     var plan = data.plan;
     plan.prover = add_tests(uid,database.startjd);
     if (memberlist[uid]) {
       // this is a group or class
       var elever = memberlist[uid];
       var andre = getOtherCG(elever); 
       plan.prover = grouptest(plan.prover, andre.gru, database.startjd);
     }
     // TODO change from startjd to parameter set by user
     valgtPlan = plan;        // husk denne slik at vi kan lagre i timeregister
     var timeplan = {};
     var xtraplan = {};
     var i,j;
     var s = '';
     var cell,userlist,gruppe,popup;
     var user = (teachers[uid]) ?  teachers[uid] : (students[uid]) ? students[uid] : {firstname:uid,lastname:''};
     var username = user.firstname + ' ' + user.lastname;
     var elever = memberlist[uid] || null;
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
     s += build_plantable(username.trim(),timeplan,xtraplan,filter);
     return s;
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


function vis_valgt_timeplan(user,filter,visfagplan) {
    // gitt en userid vil denne hente og vise en timeplan
    visfagplan = typeof(visfagplan) != 'undefined' ? true : false;
    var userplan = (user.id) ? getuserplan(user.id) : getcourseplan(user) ;
    var uid = user.id || user;
    // if user is name of klass or group then getcourseplan
    s = vistimeplan(userplan,uid,filter);
    $j("#timeplan").html(s);
}


function vis_timeplan(s,bru,filter) {
    // filter is used by vistimeplan to filter members of groups
    // so that when we look at a class - then we only see class members
    // in lists for other groups
    s += setup_timeregister();
    s+= '<div id="timeplan"></div>';
    s+= "</div>";    // this div is set up in the calling function
    var i;
    var e;
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
       vis_valgt_timeplan(bru[idx],filter,true);
    });
    $j("#velgbruker").change(function() {
       var idx = $j("#velgbruker option:selected").val();
       vis_valgt_timeplan(bru[idx],filter,true);
    });
}

function vis_gruppetimeplan() {
    var bru = brukerliste[valg];
    var ant = bru.length;
    var s="<div id=\"timeviser\"><h1>Gruppe-timeplaner</h1>";
    // this div is closed in vis_timeplan
    s+= '<div class="gui" id=\"velg\">Velg gruppen du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (var i=0;i< ant; i++) {
       var e = bru[i]; 
       var fagnavn = fullname[e.username];
       s+= '<option value="'+i+'">' + fagnavn+ " " + e.username  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,bru,'group' );
}

function vis_klassetimeplan() {
    var bru = database.classes;
    var ant = bru.length;
    var s="<div id=\"timeviser\"><h1>Klasse-timeplaner</h1>";
    s+= '<div class="gui" id=\"velg\">Velg klassen du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (i=0;i< ant; i++) {
       e = bru[i]; 
       s+= '<option value="'+i+'">' + e  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,bru,'' );
}


function vis_elevtimeplan() {
    var s="<div id=\"timeviser\"><h1>Elev-timeplaner</h1>";
    s+= '<div class="gui" id=\"velg\">Velg elev du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (var i in studentIds) {
       var idx = studentIds[i];  // stud-ids are in sorted order, students are ordered by id .. not so nice
       var e = students[idx]; 
       s+= '<option value="'+idx+'">' + e.department + " " + " " + e.institution+ " " + e.lastname + " " + e.firstname  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,students,'non' );
}

function vis_teachtimeplan() {
    var s='<div id="timeviser"><h1>Lærer-timeplaner</h1>';
    s+= '<div class="gui" id="velg">Velg lærer du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (var i in teachers) {
       e = teachers[i]; 
       s+= '<option value="'+i+'">' + e.username + " " + e.lastname + " " + e.firstname  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,teachers,'non' );
}

function getcourseplan(cgr) {
  // We want a timetable for a course/group/room
  // just try each in turn and return first found
  if (timetables.course[cgr]) {
    var elever = memberlist[cgr];
    var andre = getOtherCG(elever); 
    var xplan = [];
    for (gr in andre.gru) {
      // get timetables for all other groups for these studs
      xplan.push(timetables.group[gr]);
    }
    return {plan:timetables.course[cgr]};
  }
  if (timetables.group[cgr]) {
    var elever = memberlist[cgr];
    var andre = getOtherCG(elever); 
    var xplan = [];
    for (gri in andre.gru) {
      // get timetables for all other groups for these studs
      gr = andre.gru[gri];
      if (gr == cgr) continue;  // ignore the original group
      xplan = xplan.concat(timetables.group[gr]);
    }
    return {xplan:xplan, plan:timetables.group[cgr]};
  }
  if (timetables.room[cgr]) return {plan:timetables.room[cgr]};
  return {plan:[]};
}


function getOtherCG(studlist) {
  // given a list of students
  // returns other groups and courses that
  // are connected to these studs
    var fag = [];
    var gru = [];
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
              if ($j.inArray(efg,fag) == -1) {
                  fag.push(efg);
              }
            }
        }
    }
    return {fag:fag, gru:gru };
}    

function getuserplan(uid) {
  // assume timetables is valid
  // use memgr to pick out all groups
  // build up a timetable from timetables for each group
  if (timetables.teach[uid]) {
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

function coursetests(coursename) {  
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
  for (var day = 0; day<28; day++) {
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

