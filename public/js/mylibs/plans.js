// funksjoner for å vise fagplaner
// alle typer planer untatt timeplaner


function vis_fagplaner(data) {
    // viser fagplaner for valgt bruker
     if (data.fag) {
        var fagliste = data.fag;
        var s = '<table class="fagplaner">';
        s += '<caption>Fagplaner</caption>';
        s += '<tr><th>Fag</th><th>Tema</th><th>Vurdering</th><th>Mål</th><th>Oppgaver</th><th>Log/Merk</th></tr>';
        var i;
        for (i=0; i<fagliste.length; i++) {
            var f = fagliste[i];
            var summary = Url.decode(f.summary+'||||');
            summary = summary.replace(/<br><br>/g,"<br>");
            summary = summary.replace(/<br><br>/g,"<br>");
            summary = summary.replace(/<br>$/,"").split('\|');
            s += '<tr class="'+f.harplan+'" ><td>' + f.shortname + '</td><td>'+ summary[0] + '</td><td>' + summary[1] + '</td>';
            s += '<td>' + summary[2] + '</td><td>' + summary[3] + '</td><td>' + summary[4] + '</td></tr>';
        }
        s+= "</table>";
        return s;
     } 
     return '';
}

function show_alleprover(filter,faggrupper) {
    // filter lar deg velge fra [heldag,prøve]
    // faggrupper  { "3inf5":1,"3304":1,"3nor6":1 }
    //   bare vis prøver/heldag for fag/grupper
    filter = typeof(filter) != 'undefined' ? filter : '';
    var thisweek = database.startjd;
    var s = "<table class=\"heldag\">";
    s += "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>";
    s += "<th>Tor</th><th>Fre</th></tr>";
    var i,j;
    var e;
    for (jd = database.firstweek; jd < database.lastweek; jd += 7 ) {
      if (jd < thisweek) continue;
      s += "<tr>";
      s += '<th><div class="weeknum">'+julian.week(jd)+'</div><br class="clear" /><div class="date">' + formatweekdate(jd) + "</div></th>";
      for (j=0;j<5;j++) {
        var proveliste = '';
        var tdclass = '';
        if (database.freedays[jd+j]) {
          proveliste = database.freedays[jd+j];
          tdclass = ' class="fridag"';
        } else {
          var pr =  (!filter || filter.indexOf("prove") >= 0 ) ? alleprover[jd+j] || [] : [];
          var hd =  (!filter || filter.indexOf("heldag") >= 0 ) ? database.heldag[jd+j] || {} : {};
          for (fag in hd) {
              if (!faggrupper || faggrupper[fag]) {
                var cat = category[fag] || 0;
                proveliste += '<span class="heldag klasse' + fag.substr(0,1) + ' cat' + cat  + '">' + fag + ' ' + hd[fag] + '</span>';
              }
          } 
          for (var k=0; k< pr.length; k++) {
              var pro = pr[k];
              var faggruppe = pro.shortname.split('_');
              var fag = faggruppe[0];
              var gruppe = faggruppe[1];
              if (!faggrupper || faggrupper[gruppe] || faggrupper[pro.shortname] ) {
                var members = fag + " " + gruppe;
                if (memberlist && memberlist[gruppe]) {
                    // show members as a list (on hover)
                    var userlist = memberlist[gruppe];
                    var antall = userlist.length;
                    members = makepop(members,userlist,gruppe,'','','<span class="proveinfo">'+ pro.username 
                               + " " +pro.value+" ("+antall+' elever)</span>');
                    members = '<ul class="nav gui alleprover">' + members + '</ul>';
                }
                proveliste += '<span class="pro klasse'+fag[0]+' cat'+category[fag]+'">' + members + '</span>';
              }
          }
        }
        s += '<td'+tdclass+'>' + proveliste + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}    

function show_heldag() {
  show_alleprover("heldag");
}

function show_prover() {
    // viser prøver for gjeldende bruker
    // bør kunne velge bruker
  var uid = database.userinfo.id || 0;
  var minefaggrupper = {};
  if (timetables.teach[uid]) {
    // we have a teach 
    // a teach dosn't have all the tests for a given group
    // a group may be connected to different subjects.
    var minefag = database.teachcourse[uid];
    for (var j in minefag) {
      var fagcourse = minefag[j];
      var faggruppe = fagcourse.split('_');
      var fag = faggruppe[0];
      minefaggrupper[fagcourse] = 1;
      minefaggrupper[fag] = 1;
    }
  } else {
    var usergr = memgr[uid] || null;
    if (usergr) {
      for (var i in usergr) {
        var group = usergr[i];
        var fagliste = database.grcourses[group];
        for (var k in fagliste) {
          var fag = fagliste[k];
          minefaggrupper[fag] = 1;
        }
        minefaggrupper[group] = 1;
      }
    } 
  }
  show_alleprover("",minefaggrupper);
}

function show_all(thisweek) {
    // viser hele årsplanen (ikke prøver og heldag)
    var events = database.aarsplan;
    var prover = alleprover;
    var theader ="<table class=\"year\" >"
     + "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>"
     + "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var tfooter ="</table>";
    var s = theader;
    var week = julian.week(thisweek);
    if (week > 30 && week < 45) {
      s += "<caption>Første halvår</caption>";
    }
    if (week > 44 && week < 52) {
      s += "<caption>Første halvår II</caption>";
    }
    if (week < 13 ) {
      s += "<caption>Andre halvår</caption>";
    }
    var i,j;
    var e;
    var pro;   // dagens prover
    var txt;
    var thclass;
    var cc;

    var events = database.yearplan;
    for (i= thisweek; i < database.lastweek; i += 7) {
      e = events[Math.floor(i/7)] || { pr:[],days:[]};
      // add a page break if we pass new year
      if (julian.week(i) == "45") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Første halvår II</caption>";
      }
      if (julian.week(i) == "1") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Andre halvår</caption>";
      }
      if (julian.week(i) == "13") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Andre halvår II</caption>";
      }
      pro = { pr:(prover[i] || []) , hd:(database.heldag[i] || [] ) };
      s += "<tr>";
      //thclass = e.klass;
      thclass = '';
      //s += "<th class=\""+thclass+"\">"+e.week+"</th>";
      //s += "<th>"+julian.week(i)+'<br><span class="date">' + formatweekdate(i) + "</span></th>";
      s += '<th><div class="weeknum">'+julian.week(i)+'</div><br class="clear" /><div class="date">' + formatweekdate(i) + "</div></th>";
      for (j=0;j<6;j++) {
        var xtra = '';
        var tlist = [];
        if (database.freedays[i+j]) {
          txt = database.freedays[i+j];
          tdclass = 'fridag';
        } else {
          tdclass = '';
          if (database.heldag[i+j]) {
            var hd =  database.heldag[i+j];
            for (fag in hd) {
                tlist.push(fag + ' ' + hd[fag]);
            } 
            tdclass += 'hd';
            xtra += 'heldag';
          }
          if (prover[i+j] ) {
              tdclass += 'pr';
              tlist.push(countme(prover[i+j]) + ' prøver');
              //xtra += '<span title="prøve" class="enprove">x</span>'; 
              xtra += ' prøve';
          }
          xtra = (xtra) ? '<div class="gui textcenter hinted">'+xtra+'</div>' : '';
          txt = e.days[j] || xtra;
        }
        var title = tlist.join(','); 
        title = (title) ? 'title="'+title+'"' : '';
        s += '<td ' + title + ' class="'+tdclass+'">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    //s += '<div class="gui gradback rcorner centered textcenter rcorner infobox" >Hei</div>';
    s += '<div id="dialog" class="gui" title="Fargekoder">'
        + '<table><tr><td class="hd">Heldag</td><td class="pr">Prøve</td><td class="hdpr">Heldag + Prøve</td></tr></table>'
        + 'Sett markøren over prøve/heldag for å se info.</div>';
    $j("#main").html(s);
    $j("#dialog").dialog().fadeTo(3000,0.4,function () {
           $j(this).dialog('close');
        });
}



function updateFagplanMenu(fagliste) {
    // denne funksjonen kjøres ved onready etter at timeplanen for brukeren er lest
    // den oppdaterer menyen MinePlaner med en liste med fag
    // <a id="mineplaner"   href="#">Mine fagplaner</a>
    var s = '<a id="mineplaner"   href="#">Mine fag</a><ul>';
    s += '<li><a href="#">Planer</a><ul>';
    for (var i=0;i < fagliste.length; i++) {
        var fag = fagliste[i];
        s += '<li><a id="'+fag.shortname+'" href="#">' + fag.shortname + '</a></li>';
    }
    s += '</ul></li><li><a href="#">Prøver</a><ul>';
    for (i=0;i < fagliste.length; i++) {
        var fag = fagliste[i];
        s += '<li><a id="prove_'+fag.shortname+'" href="#">' + fag.shortname + '</a></li>';
    }
    s += '</ul></li></ul>';
    $j("#teachmenu").html(s);
    //$j("#mineplaner").after('<li><a href="">Prøveplaner</a></li>');
    for (var i=0;i < fagliste.length; i++) {
        var fag = fagliste[i];
        $j("#prove_"+fag.shortname).click(function() {
            var fagnavn = $j(this).html();
            var plandata = fagplaner.fagliste[fagnavn];
            var datoliste = fagplaner.wdates;
            edit_proveplan(fagnavn,plandata,datoliste);
        } );
        $j("#"+fag.shortname).click(function() {
            var fagnavn = $j(this).html();
            var plandata = fagplaner.fagliste[fagnavn];
            var datoliste = fagplaner.wdates;
            visEnPlan(fagnavn,plandata,datoliste,true);
        } );
    }
    // hent ut og lagre mine egne fagplaner
    var url = 'aarsplan/php/getfagplaner.php';
    $j.getJSON( url, { "user":userinfo.uid },
      function(data) {
       fagplaner = data;
      });
}


function vis_andreplaner() {
    var s="<div id=\"timeviser\"><h1>Andre fagplaner</h1><h4>Velg fra menyen Fagplaner-&gt;AndreFag ..</h4>";
    $j("#main").html(s);
}


// visEnPlan har flytta til rediger.js
// da den lar deg redigere dersom du er eier av planene



function show_next4() {
    // vis neste fire uker
    var events = database.yearplan;
    var thisweek = database.startjd;
    var s = "<table class=\"uke next\">";
    s += "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>";
    s += "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var i,j,k;
    var e;
    var jdclass;
    for (i=thisweek; i < thisweek+22; i+= 7) {
      e = events[Math.floor(i/7)] || {pr:[],days:[ [],[],[],[],[],[] ] };
      s += "<tr>";
      //s += "<th>"+julian.week(i)+'<br><span class="date">' + formatweekdate(i) + "</span></th>";
      s += '<th><div class="weeknum">'+julian.week(i)+'</div><br class="clear" /><div class="date">' + formatweekdate(i) + "</div></th>";
      for (j=0;j<6;j++) {
          tdclass = '';
          if (database.freedays[i+j]) {
            txt = database.freedays[i+j];
            tdclass = ' class="fridag"';
          } else {
            txt = e.pr[j] || " ";
            if (txt != " ") {
              txt = "<span class=\"prove\">" + txt + "</span>";
            } else {
              txt = "";
            }
            txt += e.days[j] || "";
          }
          s += '<td'+tdclass+'>' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}

