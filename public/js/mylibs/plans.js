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

function show_alleprover() {
    var thisweek = database.startjd;
    var s = "<table class=\"heldag\">";
    s += "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>";
    s += "<th>Tor</th><th>Fre</th></tr>";
    var i,j;
    var e;
    for (jd = database.firstweek; jd < database.lastweek; jd += 7 ) {
      if (jd < thisweek) continue;
      s += "<tr>";
      s += "<th>"+julian.week(jd)+"</th>";
      for (j=0;j<5;j++) {
        var pr = alleprover[jd+j];
        var hd = heldag[jd+j];
        var hd_txt = Url.decode(e.hd[j]);
        var pr_txt = '';
        var pr = Url.decode(e.pr[j]);
        var prover = pr.split('zz');
        for (var k=0; k< prover.length; k++) {
            var pro = prover[k];
            if (pro == '') continue;
            var elm = pro.split('|');
            var faggruppe = elm[0].split('_');
            var fag = faggruppe[0];
            var gruppe = faggruppe[1];
            var members = fag + " " + gruppe;
            if (memberlist && memberlist[gruppe]) {
                // show members as a list (on hover)
                var userlist = memberlist[gruppe];
                var antall = userlist.length;
                members = makepop(members,userlist,gruppe,'','','<span class="proveinfo">'+elm[2] + " " +elm[1]+" ("+antall+' elever)</span>');
                members = '<ul class="nav alleprover">' + members + '</ul>';
            }
            pr_txt += '<span class="pro klasse'+pro[0]+' cat'+category[fag]+'">' + members + '</span>';
        }
        s += "<td>" + hd_txt + pr_txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}    

function show_heldag() {
    // viser alle heldager
    // mine heldager bør framheves?
    var events = database.aarsplan;
    var thisweek = database.thisweek;
    var s = "<table class=\"heldag\">";
    s += "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>";
    s += "<th>Tor</th><th>Fre</th></tr>";
    var i,j;
    var e;
    var txt;
    var thclass;
    var cc;
    for (i= 0; i < database.antall; i++) {
      e = events[i];
      if (e.julday < thisweek) continue;
      s += "<tr>";
      s += "<th>"+e.week+"</th>";
      for (j=0;j<5;j++) {
        txt = Url.decode(e.hd[j]);
        s += '<td class="heldag">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}

function show_prover() {
    // viser prøver for gjeldende bruker
    // bør kunne velge bruker
    var events = database.aarsplan;
    var thisweek = database.thisweek;
    var s = "<table class=\"prover\">";
    s += "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>";
    s += "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var i,j;
    var e;
    var txt;
    var thclass;
    var cc;
    for (i= 0; i < database.antall; i++) {
      e = events[i];
      if (e.julday < thisweek) continue;
      s += "<tr>";
      s += "<th>"+e.week+"</th>";
      for (j=0;j<6;j++) {
        txt = Url.decode(e.pr[j]);
        jdclass = (txt == " ") ? "normal" : "prover";
        s += "<td class=\""+jdclass+"\">" + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}

function show_all(thisweek) {
    // viser hele årsplanen (ikke prøver og heldag)
    var events = database.aarsplan;
    var prover = alleprover.alleprover;
    var theader ="<table class=\"year\" >"
     + "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>"
     + "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var tfooter ="</table>";
    var s = theader;
    s += "<caption>Første halvår</caption>";
    var i,j;
    var e;
    var pro;   // dagens prover
    var txt;
    var thclass;
    var cc;
    for (i= 0; i < database.antall; i++) {
      e = events[i];
      if (e.julday < thisweek) continue;
      // add a page break if we pass new year
      if (e.week == "45") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Første halvår II</caption>";
      }
      if (e.week == "1") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Andre halvår</caption>";
      }
      if (e.week == "13") {
         s += tfooter + '<div class="page-break"></div><p>' + theader;
         s += "<caption>Andre halvår II</caption>";
      }
      pro = prover[i];
      s += "<tr>";
      thclass = e.klass;
      s += "<th class=\""+thclass+"\">"+e.week+"</th>";
      for (j=0;j<6;j++) {
        cc = Url.decode(e.days[j][1]);
        var xtra = '';
        if (pro.hd[j]) {
            xtra += '<span title="heldag" class="enheldag">+</span>'; 
        }
        if (pro.pr[j]) {
            xtra += '<span title="prøve" class="enprove">x</span>'; 
        }
        txt = Url.decode(e.days[j][0]);
        s += "<td class=\""+cc+"\">" + txt + xtra + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
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
      e = events[Math.floor(i/7)] || {pr:[],days:[]};
      s += "<tr>";
      s += "<th>"+e.week+"</th>";
      for (j=0;j<6;j++) {
          txt = e.pr[j] || " ";
          if (txt != " ") {
            txt = "<span class=\"prove\">" + txt + "</span>";
          } else {
            txt = "";
          }
          txt += e.days[j] || "";
          s += "<td>" + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}


function show_info() {
    // vis merknadsfeltet fra årsplanen
    var events = database.yearplan;
    var thisweek = database.startjd;
    var s = "<table class=\"info\" border='2'>";
    s += "<tr><th>Uke</th><th>Merknad</th></tr>";
    var i,j,weeknum;
    var e;
    for (i = database.firstweek; i<database.lastweek; i += 7 ) {
      e = events[Math.floor(i/7)] || { pr:[],days:[]};
      s += "<tr>";
      s += "<th>"+julian.week(i)+"</th>";
      var txt = e.days[5] || "";
      s += "<td>" + txt + "</td>";
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
}

