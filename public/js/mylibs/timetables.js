//show timetables

function makepop(cell,userlist,username,gruppe,filter,heading) {
    // lag en css:hover som viser elever i en gruppe
    // denne funksjonen er memoized - den husker på
    // elevlista for tuple (gruppe,username)
    if (popmemoizer[gruppe+username]) {
        return popmemoizer[gruppe+username];
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
    popmemoizer[gruppe+username] = ce;
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

function build_timetable(timeplan,plan,filter,planspan) {
    // fills in a table with events from a plan
     var spanstart = typeof(planspan) != 'undefined' ? '<span class="'+planspan+'">' : '';
     var spanend   = typeof(planspan) != 'undefined' ? '</span>' : '';
     var spa,sto;
     for (i=0; i< plan.length;i++) {
        spa = spanstart; sto = spanend;
        var pt = plan[i];
        var cell = pt.value.replace(' ','_');
        if (!timeplan[pt.slot]) {
            timeplan[pt.slot] = {};
        }
        if (!timeplan[pt.slot][pt.day]) {
             timeplan[pt.slot][pt.day] = '';
        }
        var room = (pt.nuroom && filter != 'RAD' ) ? "&nbsp;<span class=\"rombytte\">=&gt;&nbsp;" + pt.nuroom + "</span>" : '&nbsp;'+pt.room ;
        cell += room;
        if (pt.pr == "y" && filter != 'RAD' ) {
          if (spanstart) {
            spa = '<span class="'+planspan+' timeprove">';
          } else {
            spa = '<span class="timeprove">';
            sto = '</span>';
          }
        }
        timeplan[pt.slot][pt.day] += spa + cell + sto; 
     }
     return timeplan;
}

function build_plantable(username,timeplan,xtraplan,filter) {
    // lager en html-tabell for timeplanen
    var start = Url.decode(database.start).split(",");
    var members = username;
    if (filter == 'group') {
        members = fullname[username] + " " + username;
    }
    if (memberlist && memberlist[username]) {
        // this is a timetable for a group/class
        // show members as a list in caption (on hover)
        var userlist = memberlist[username];
        members = makepop(members,userlist,username,'','');
        members = '<ul id="members" class="nav">' + members + '</ul>';
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
             xcell = xtraplan[i][j];
             if ($j.isArray(xcell)) {
                xcell = '<ul class="nav'+bad+'"><li><a href="#">'+header+'</a><ul>' 
                       + xcell.join('') 
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

function vistimeplan(data,username,filter) {
     // viser timeplan med gitt datasett
     var plan = data.plan;
     valgtPlan = plan;        // husk denne slik at vi kan lagre i timeregister
     var timeplan = {};
     var xtraplan = {};
     var i,j;
     var s = '';
     var cell,userlist,gruppe,popup;
     // hent ut normalplanen - skal vises som ren text
     timeplan = build_timetable(timeplan,plan,filter);
     // hent ut ekstraplanen - skal vises som css:hover
     if (data.xplan) {
        var xplan = data.xplan;
        for (i=0; i< xplan.length;i++) {
            var pt = xplan[i];
            var cell = pt.value.replace(' ','_');
            gruppe = cell.split('_')[1];
            if (!xtraplan[pt.slot]) {
                xtraplan[pt.slot] = {};
            }
            if (!xtraplan[pt.slot][pt.day]) xtraplan[pt.slot][pt.day] = [];
            userlist = memberlist[gruppe];
            popup = makepop(cell,userlist,username,gruppe,filter);
            xtraplan[pt.slot][pt.day].push(popup);
        }
     }
     s += build_plantable(username,timeplan,xtraplan,filter);
     return s;
}


function vis_valgt_timeplan(user,url,filter,visfagplan) {
    // gitt en userid vil denne hente og vise en timeplan
    visfagplan = typeof(visfagplan) != 'undefined' ? true : false;
    eier = user;
    var enr = eier.id;
    var username = eier.username;
    var userlist = '';
    if (memberlist[username]) {
        userlist = memberlist[username];
    }
    if (siste10[enr]) {
        var data = siste10[enr];
        s = vistimeplan(data,username,filter);
        if (visfagplan) s += vis_fagplaner(data);
        $j("#timeplan").html(s);
        return;
    }

    $j("#timeplan").html("Henter timeplan ... ");
    $j.getJSON( url, { "user":enr,"username":username, "userlist":userlist },
                function(data) {
                    siste10[enr] = data;
                    s = vistimeplan(data,username,filter);
                    if (visfagplan) s += vis_fagplaner(data);
                    $j("#timeplan").html(s);
                });
}


function vis_timeplan(s,bru,ant,url,filter) {
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
    $j("#velgbruker").change(function() {
       var idx = $j("#velgbruker option:selected").val();
       vis_valgt_timeplan(bru[idx],url,filter,true);
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
    vis_timeplan(s,bru,ant,"aarsplan/php/gettimeplangruppe.php",'group' );
}

function vis_klassetimeplan() {
    var bru = brukerliste[valg];
    var ant = bru.length;
    var s="<div id=\"timeviser\"><h1>Klasse-timeplaner</h1>";
    s+= '<div class="gui" id=\"velg\">Velg klassen du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (i=0;i< ant; i++) {
       e = bru[i]; 
       s+= '<option value="'+i+'">' + e.username  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,bru,ant,"aarsplan/php/gettimeplangruppe.php",'klasse' );
}


function vis_elevtimeplan() {
    var bru = brukerliste[valg];
    var ant = bru.length;
    var s="<div id=\"timeviser\"><h1>Elev-timeplaner</h1>";
    s+= '<div class="gui" id=\"velg\">Velg elev du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (i=0;i< ant; i++) {
       e = bru[i]; 
       s+= '<option value="'+i+'">' + e.department + " " + e.institution + " " + e.lastname + " " + e.firstname  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,bru,ant,"aarsplan/php/gettimeplan.php",'non' );
}

function vis_teachtimeplan() {
    var bru = brukerliste[valg];
    var ant = bru.length;
    var s='<div id="timeviser"><h1>Lærer-timeplaner</h1>';
    s+= '<div class="gui" id="velg">Velg lærer du vil se timeplanen for <select id="velgbruker">';
    s+= '<option value="0"> --velg-- </option>';
    for (i=0;i< ant; i++) {
       e = bru[i]; 
       s+= '<option value="'+i+'">' + e.username + " " + e.lastname + " " + e.firstname  +  "</option>";
    }
    s+= "</select></div>";
    vis_timeplan(s,bru,ant,"aarsplan/php/gettimeplan.php",'non' );
}



function show_thisweek() {
    // viser denne uka, årsplanen + timeplan
    //var uid = userinfo.id;
    var s='<div id="timeviser"><h1>'+user+'</h1>';
    s+= '<div id="timeplan"></div>';
    s+= "</div>";
    $j("#main").html(s);
    if (memothisweek) {
        $j("#timeplan").html(memothisweek);
        return;
    }
    // last inn årsplan-data for denne uka
    //var enr = uid
    var userlist = '';
    var url = "aarsplan/php/gettimeplan.php";
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
    // hent timeplan og fagplan for denne uka
    /*
    $j("#timeplan").html("Henter timeplan ... ");
    $j.getJSON( url, { "user":enr,"username":user, "userlist":userlist },
                function(data) {
                    s += vistimeplan(data,user,'');
                    s += vis_fagplaner(data);
                    memothisweek = s;
                    $j("#timeplan").html(s);
                    updateFagplanMenu(data.fag);
                });
    */
}





function setup_timeregister() {
    // tegner gui for timeplan-minne
    var s = '<div id="push" class="button posbut gui">husk</div>';
    s += '<div id="minne" class="memory gui"><h4>Minne</h4><div id="memlist"></div></div>';
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

function addToMemory() {
    // legger til en ny bruker til minnet
    if (valgtPlan && eier && eier.username) {
        var username = eier.username;
        if (!timeregister[username]) {
           timeregister[username] = valgtPlan;
        }
    }
}

