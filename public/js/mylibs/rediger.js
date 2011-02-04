// editing functions


function edit_proveplan(fagnavn,plandata,start,stop) {
    // rediger prøveplanen for et fag
    minfagplan = fagnavn;
    iddx = 0;
    var jd = database.firstweek;
    var tests = coursetests(minfagplan);
    var tjd;
    var info = synopsis(minfagplan,plandata,tests);
    var felms = fagnavn.split('_');
    var fag = felms[0];
    var gru = felms[1];
    var elever = memberlist[gru];
    var events = database.aarsplan;
    var thisweek = database.thisweek;
    var timmy = {};
    var tidy = {};
    for (var tt in timetables.course[fagnavn] ) {
      var tty = timetables.course[fagnavn][tt];
      if (!timmy[tty[0]]) {
        timmy[tty[0]] = {};
        tidy [tty[0]] = [];
      }
      if (timmy[ tty[0] ][ tty[1] ]) continue;
      timmy[ tty[0] ][ tty[1] ] = 1;
      tidy[ tty[0] ].push(""+(1+tty[1]));
    }
    var s = '<div id="proveplan">';
    s += '<h1>Prøveplan</h1>';
        s += '<div class="centered sized1"><div class="button float gui" id="toot">Hele</div>'
        + '<div  class="button float gui" id="rest">Fra idag</div></div>';
    if (isteach) {
        s += '<p  id="editmsg"> Legg til ny prøve med grønn knapper, klikk på eksisterende for å endre.</p>';
    } else {
        s += '<p  id="editmsg">&nbsp; </p>';
    }
    s += '<table id="testeditor" class="gradback centered sized1 border1">';
    s += '<caption>' + fagnavn + '</caption>';
    s += '<tr><th class="time">Uke</th><th>Oversikt</th><th>Man</th><th>Tir</th><th>Ons</th>';
    s += "<th>Tor</th><th>Fre</th></tr>";
    var i,j,k;
    var txt;
    var thclass;
    var cc;
    var txt = '&nbsp;';
    var e,klass,idd,pro;
    for (section in  plandata) {
        var uke = julian.week(jd);
        tjd = jd;
        jd += 7;
        if (!(+uke > 0)) continue;
        if (+uke > 30 && start < 30) continue;
        if ((+uke < start && start < 30) || (start > 30 && +uke > 30 && +uke < start) ) continue;
        if ((+uke > stop && +uke < 30) || (stop > 30  && +uke > stop) || (stop > 30 && +uke < 30) ) continue;
        if (+section < 10) {
            section = '0' + section;
        }
        if (+uke < 10) {
            uke = '0' + uke;
        }
        var testweek = tests[tjd];
        var test = '';
        var weektest = ['','','','',''];
        var weekclass = ['','','','',''];
        var syno = info[+section].links;
        var heldg = info[+section].heldag;
        for (var w=0; w<5; w++) {
          if (database.freedays[tjd+w]) {
            weektest[w] = database.freedays[tjd+w];
            weekclass[w] = 'class="fridag"';
          } else if (heldg[w]) {
            weektest[w] = heldg[w].join('<br>');
            weekclass[w] = 'class="hd"';
          } else {
            var syn = syno[w] || [];
            weektest[w] += syn.join('');
            // only add new button if no other tests
            if  (timmy[w] && isteach && !weektest[w] ) {
               weektest[w] += '<a active="" rel="#testdialog" id="jdw'+tjd+'_'+w+'" class="addnew">+</a>' ;
            }
          }
        }
        if (testweek) {
          for (var t in testweek) {
            var tw = testweek[t];
            weektest[tw.day] = '<a rel="#testdialog" id="jdw'+tjd+'_'+tw.day+'" active="'+tw.slots+'" class="prove">prøve ' + tw.slots + ' time</a>';
          }
        }
        klass = (isteach) ? ' class="edit_area"' : '';
        idd = 'wd' + section + '_';
        s += '<tr id="section'+section+'">';
        s += '<th><div class="weeknum">'+julian.week(tjd)
             +'</div><br class="clear" /><div class="date">' + formatweekdate(tjd) + "</div></th>";
        s += '<td class="synopsis">'+info[+section].tiny+'</td>';
        for (var w=0; w<5; w++) {
          //s += '<td id="jd'+idd+'" >' + txt + '<span class="addnew">+</span></td>';
          s += '<td '+weekclass[w]+'>'+weektest[w]+'</td>';
        }
        s += '</tr>';
    }
    s += "</table>";
    s += "</div>";
    s += '<div class="simple_overlay" id="testdialog">'
        + '<h1>Registrer prøve</h1>'
        + '<div id="proveform"></div><div id="prolagre" class="close button gui float">Lagre</div> <div id="proavbryt" class="close button gui float">Avbryt</div>'
        + '</div>';
    $j("#main").html(s);
    $j(".totip").tooltip();
    var uke = database.week;
    $j("#toot").click(function() {
        edit_proveplan(fagnavn,plandata,33,26);
    });
    $j("#rest").click(function() {
        edit_proveplan(fagnavn,plandata,uke,26);
    });
    if (isteach) {

      $j("a.addnew,a.prove").click(function() {
          var id = $j(this).attr('id');
          var wd = id.split('_')[1];
          var par = $j(this);
          var id = par.attr("id");
          var actatr = par.attr("active");
          var active = (actatr) ? actatr.split(',') : tidy[wd];
          var s = generate(id,wd,active,tidy[wd]);
          $j("#proveform").html(s);
          $j("#prolagre").click(function () { 
               var timer = $j.map($j("table.testtime tr.trac th"),function(e,i) {
                    return e.innerHTML.split(' ')[0];
                 });
             });
          $j("#proavbryt").click(function () { 
             });
          $j("span.velgprove").click(function(){
             $j(this).parent().parent().toggleClass("trac");
           });
      }).overlay({ 
          mask: {
                  color: '#ebecff',
                  loadSpeed: 200,
                  opacity: 0.8
          },
          closeOnClick: false });
    }
}

function generate(id,wd,active,tty) {
  var unplanned = { 1:1,2:1,3:1,4:1,5:1,6:1,7:1,8:1,9:1}
  for (var ac in active) {
    delete unplanned[ +active[ac] ];
  }
  var un = [];
  for (var ww in unplanned) {
     un.push(+ww);
  }
  var s = '<div class="centered" id="testtime" ><table class="testtime" >';
  for (var i=1; i<10; i++) {
    var acc = ($j.inArray(""+i,active) >= 0);
    s += '<tr'+( acc ? ' class="trac"' : '') +'"><th>' + i + ' time</th><td><span class="velgprove"> 3inf5-haau</span></td></tr>';
  }
  s    += '</table></div>';
  return s;

}


var minfagplan;            // remember the name of current fagplan - used for saving
var changedPlans = {};     // hash of changed sections in a fagplan
var minVisning = "#rest";  // valgt visning - slik at vi kan tegne på nytt
var mycopy;                //  {}  a copy of a plan
var activeplan;            //  plandata for chosen plan

function visEnPlan(fagnavn,plandata,egne) {
    activeplan = plandata;
    egne = typeof(egne) != 'undefined' ? true : false;
    minfagplan = fagnavn;
    var myteachers = $j.map(database.courseteach[fagnavn].teach,function(e,i) {
           return (teachers[e].firstname + " " + teachers[e].lastname);
        }).join(', ');
    var s='<div id="fagplan">';
    s += '<h1><a class="copylink" href="yearplan.html?plan='+fagnavn+'">'+ fagnavn  +'</a></h1>';
    s += '<h3 class="textcenter" >'+ myteachers  +'</h3>';
    if (isteach && egne) {
        s += '<div id="saveme" class="button fixx">Lagre</div>'
          + ' <span id="editmsg">Du kan redigere planen ved å klikke på en rute</span>';
    }
    s += '<div class="button float gui" id="toot">Hele</div>'
      + '<div  class="button float gui" id="rest">Fra idag</div>';
    if (isteach) {
       s += '<div  class="button float gui" id="copy">Ta kopi</div>';
    }
    if (isteach && egne && mycopy) {
      s += '<div  class="button float gui" id="paste">Lim inn</div>';
    }
    s += '<div class="clear"></div>'
      + '<div id="planviser"></div>'
      + '</div>';
    $j("#main").html(s);
    $j("#saveme").hide().click(function() {
        // anta at alle endringer er tilbakeført til fagplanen
        //    fagplaner.fagliste[fagnavn];
        $j(this).removeClass("button").html('<img src="img/indicator.gif">');
        var all = [];
        for (var i in changedPlans) {
            var section = +i;
            all.push('' + section + 'x|x' + changedPlans[i]);
        }
        var alltext = all.join('z|z');
        var courseid = database.courseteach[fagnavn].id;
        if (alltext) {
          $j.post( "/save_totfagplan", { "alltext":alltext, "courseid":courseid },
                function(data) {
                    $j("#editmsg").html(data.msg);
                    $j("#saveme").hide().addClass("button").html('Lagre');
                    $j(minVisning).click();
                });
        }
        changedPlans = [];
    });
    var uke = database.week;
    $j("#toot").click(function() {
        var plan = visEnValgtPlan(plandata,egne,33,26);
        $j("#planviser").html(plan);
        $j(".totip").tooltip();
        fagplan_enable_editing(isteach,egne);
        minVisning = "#toot";
    });
    $j("#rest").click(function() {
        var plan = visEnValgtPlan(plandata,egne,uke,26);
        $j("#planviser").html(plan);
        $j(".totip").tooltip();
        fagplan_enable_editing(isteach,egne);
        minVisning = "#rest";
    });
    var plan = visEnValgtPlan(plandata,egne,uke,26);
    $j("#planviser").html(plan);
    $j(".totip").tooltip();
    fagplan_enable_editing(isteach,egne);


    $j("#paste").click(function() {
       if (mycopy) {
          pasteIntoThisPlan(fagnavn,egne);
       }
    });
    $j("#copy").click(function() {
        mycopy = activeplan;
    });
}

function pasteIntoThisPlan(fagnavn,egne) {
    visEnPlan(fagnavn,mycopy,egne);
    changedPlans = {};
    for (var i in mycopy) {
        var elm = mycopy[i];
        changedPlans[elm.section] = translatebreaks(elm.summary);
    }
    fagplaner.fagliste[fagnavn] = mycopy;
    $j("#saveme").show();
    $j("#editmsg").html('Planen er oppdatetert, men IKKE lagra.');
}


function visEnValgtPlan(plandata,egne,start,stop) {
    // viser en plan - du kan redigere dersom du er eier
     var s = '<table class="fagplan" >'
     + "<tr><th>Uke</th><th>Info</th><th>Tema</th><th>Vurdering</th><th>Mål</th><th>Oppgaver</th><th>Logg/merk</th></tr>";
    var i,j,e,klass,idd;
    //for (i= thisweek; i < database.lastweek; i += 7) {
    var jd = database.firstweek;
    var tests = coursetests(minfagplan);
    var tjd;
    var info = synopsis(minfagplan,plandata,tests);
    for (section in  plandata) {
        //for (i= 0; i < 47; i++) {
        summary = plandata[section]; 
        //var dato = datoliste[i] || '';
        //var elm = dato.split(' ');
        //var uke = elm[0] || '';
        var uke = julian.week(jd);
        tjd = jd;
        jd += 7;
        if (!(+uke > 0)) continue;
        if (+uke > 30 && start < 30) continue;
        if ((+uke < start && start < 30) || (start > 30 && +uke > 30 && +uke < start) ) continue;
        if ((+uke > stop && +uke < 30) || (stop > 30  && +uke > stop) || (stop > 30 && +uke < 30) ) continue;
        if (+section < 10) {
            section = '0' + section;
        }
        if (+uke < 10) {
            uke = '0' + uke;
        }
        var testweek = tests[tjd];
        var test = '';
        summary += '|||||';
        summary = summary.replace(/(<br>)+/g,"<br>");
        summary = summary.replace(/<br>$/,"");
        summary = summary.replace(/(&amp;nbsp;)+/g," ");
        var elements = summary.split('|');
        if (testweek) {
          test = $j.map(testweek,function(e,i) {
                 return '<span class="prove">prøve ' + dager[+e.day] + "dag " + e.slots + " time</span>";
              txt = "<span class=\"prove\">" + pro.shortname+ ' ' + pro.value + "</span>";
              }).join('<br>');
        }
        klass = (isteach && egne) ? ' class="edit_area"' : '';
        idd = 'wd' + section + '_';
        s += '<tr id="section'+section+'">';
        s += '<th><div class="weeknum">'+julian.week(tjd)+'</div><br class="clear" /><div class="date">' + formatweekdate(tjd) + "</div></th>";
        s += '<td class="synopsis">'+info[+section].tiny+'</td>';
        s += '<td><div id="'+idd+'0" '+klass+'>' + elements[0] + "</div></td>";
        s += '<td>'+test+'<div id="'+idd+'1" '+klass+'>' + elements[1] + "</div></td>";
        s += '<td><div id="'+idd+'2" '+klass+'>' + elements[2] + "</div></td>";
        s += '<td><div id="'+idd+'3" '+klass+'>' + elements[3] + "</div></td>";
        s += '<td><div id="'+idd+'4" '+klass+'>' + elements[4] + "</div></td>";
        s += '</tr>';
    }
    s += "</table>";
    return s;
}

function edit_aarsplan() {
    var s="<h1>Rediger Årsplanen</h1>";
    s+=  '<p>Klikk på rutene for å redigere - klikk utenfor (på hvit bakgrunn) for å avbryte. Dette er generell info - ikke heldagsprøver</p>';
    // viser hele årsplanen (ikke prøver og heldag)
    var events = database.aarsplan;
    var theader ="<table class=\"year\" >"
     + "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>"
     + "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var tfooter ="</table>";
    s += theader;
    s += "<caption>Første halvår</caption>";
    var i,j;
    var e;
    var pro;   // dagens prover
    var txt;
    var thclass;
    var cc;
    for (i= 0; i < database.antall; i++) {
      e = events[i];
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
      s += "<tr>";
      thclass = e.klass;
      s += "<th class=\""+thclass+"\">"+e.week+"</th>";
      for (j=0;j<6;j++) {
        var idd = e.julday + '_' + j;
        cc = e.days[j][1];
        var klass = (cc != 'fridag') ? 'edit_area' : cc;
        txt = e.days[j][0];
        s += '<td id="jd'+idd+'" class="'+klass+'">' + txt + '</td>';
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
    enable_editing("aarsplan/php/save_simple.php?eventtype=aarsplan");
}

function edit_fridager() {
    var s="<h1>Rediger Fridager</h1>";
    s+=  '<p>Klikk på rutene for å redigere<br />';
    s+=  'Klikk utenfor (på hvit bakgrunn) for å avbryte.</p>';
    // viser hele årsplanen (ikke prøver og heldag)
    var events = database.aarsplan;
    var theader ="<table class=\"year\" >"
     + "<tr><th>Uke</th><th>Man</th><th>Tir</th><th>Ons</th>"
     + "<th>Tor</th><th>Fre</th><th>Merknad</th></tr>";
    var tfooter ="</table>";
    s += theader;
    s += "<caption>Første halvår</caption>";
    var i,j;
    var e;
    var pro;   // dagens prover
    var txt;
    var thclass;
    var cc;
    for (i= 0; i < database.antall; i++) {
      e = events[i];
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
      s += "<tr>";
      thclass = e.klass;
      s += "<th class=\""+thclass+"\">"+e.week+"</th>";
      for (j=0;j<6;j++) {
        var idd = e.julday + '_' + j;
        cc = e.days[j][1];
        txt = (cc != 'normal') ? e.days[j][0] : '';
        s += '<td id="jd'+idd+'" class="edit">' + txt + '</td>';
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
    enable_editing("aarsplan/php/save_simple.php?eventtype=fridager");
}


var iddx;   // used to give unique ids to new heldag elements

function edit_heldag() {
    iddx = 0;
    var s="<h1>Rediger Heldager</h1>";
    s+=  '<p>Klikk på pluss knappen for å legge til en prøve. Klikk på teksten for å redigere (og slette)<br />';
    s+=  'Klikk utenfor (på hvit bakgrunn) for å avbryte.</p>';
    var events = database.aarsplan;
    var thisweek = database.thisweek;
    s += "<table class=\"heldag\">";
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
        var idd = e.julday + j;
        txt = e.hd[j];
        s += '<td id="jd'+idd+'" >' + txt + '<span class="addnew">+</span></td>';
      }
      s += "</tr>";
    }
    s += "</table>";
    $j("#main").html(s);
    $j("span.heldag").addClass("edit");
    $j("span.addnew").click(function() {
        $j(this).before('<span id="new'+iddx+'" class="heldag edit"></span>');
        heldag_enable_editing();
        iddx++;
    });
    heldag_enable_editing();
}


function edit_bortfall() {
    var s="<div id=\"timeviser\"><h1>Rediger Undervisningsbortfall</h1>";
    s+=  '<p>Rediger timer - klikk på rutene for å redigere</p>';
    $j("#main").html(s);
}


function check_heldag(value,settings) {
    // checks that we have a correct structure on edited text
    // we want FAGNAVN some text
    var elm = value.split(' ')
    var fagnavn = elm[0].toUpperCase();
    elm.shift();
    var beskrivelse = elm.join(' ');
    var correct = fagnavn + " " + beskrivelse;
    if (category[fagnavn]) {
        // a legal name - set id of element to 'hd'+julday+'_'+fagnavn
        // so that it can be removed for mysql later
        var jd = $j("#"+this.id).parent().attr("id").substr(2);
        $j("#"+this.id).attr("id","hd" + jd + "_" + fagnavn);
        $j.post( "/save_heldag", { "julday":jd, "fag":fagnavn, "value":beskrivelse });
        // this is the code that actually sends the new info to the server and inserts into mysql
        return(correct);
    } else {
        if (value == '') {
            var pid = $j("#"+this.id).attr("id");
            $j.post( "/delete_heldag", { "pid":pid });
            // try to delete this entry from the database
            $j("#"+this.id).remove();
            return false;
        }
        return("FEIL FAG fagnavn :"+value);
    }
}

function save_fagplan(value,settings) {
    // save the changed element into compound week data a|b|c|d|e
    var myid = this.id;
    $j(this).removeClass( "ui-state-highlight" );
    var base = myid.substr(0,5);
    var week = myid.substr(2,2);
    var idx  = myid.substr(5,1);
    var summary = '';
    $j("#editmsg").html('Lagrer data ...');
    var section = this.id.substr(2,2);
    for (var i=0; i<5; i++) {
        if (myid == base + i) {
            summary += value + '|';
        } else {
            var elm = $j("#"+base+i).removeClass( "ui-state-highlight" ).html();
            elm = (elm == '&nbsp;') ? '' : elm;
            summary += elm + '|';
        }
    }
    delete  changedPlans[section];
      // if we edit a cell that has been added to changedPlans by drop or paste
      // then we must remove it from list of cells to be updated (as it is now
      // saved with new content)
    update_fagplaner(minfagplan,section,summary);
    var courseid = database.courseteach[minfagplan].id;
    $j.post( "/save_fagplan", { "section":section,"value":value, "idx":idx, "week":week, "courseid":courseid, "summary":summary },
    function(data) {
        if (data.ok) {
            $j("#editmsg").html('Du kan redigere planen ved å klikke på en rute');
        } else {    
            $j("#editmsg").html('<span class="error">'+data.msg+'</span>');
        }
    });
    value = value.replace(/\n|\r/g,"<br>");
    return(value);
}


function update_fagplaner(fagnavn,section,summary) {
    courseplans[fagnavn][section] = summary;
    //summary = Url.encode(summary);
    //for (var i=0; i < plandata.length; i++) {
}

function translatebreaks(s) {
    return s.replace(/<br>/g,"\n");
}

function fagplan_enable_editing(lerar,owner) {
     if (!(lerar && owner)) return;
     $j('.edit_area').draggable({
            //cancel: "a.ui-icon", // clicking an icon won't initiate dragging
            revert: "invalid", // when not dropped, the item will revert back to its initial position
            helper: function() {
                 return $j( "<div class='helper'>Drg</div>" )[0];
                },
            cursor: "move"
        });
     $j( '.edit_area' ).droppable({
        drop: function( event, ui ) {
                var value = ui.draggable.html() ;
                $j( this )
                .addClass( "ui-state-highlight" )
                .html(value);
                var summary = '';
                var myid = $j(this).attr("id");
                var section = myid.substr(2,2);
                var base = myid.substr(0,5);
                var idx  = myid.substr(5,1);
                for (var i=0; i<5; i++) {
                    if (myid == base + i) {
                        summary += value + '|';
                    } else {
                        var elm = $j("#"+base+i).html();
                        elm = (elm == '&nbsp;') ? '' : elm;
                        summary += elm + '|';
                    }
                }
                update_fagplaner(minfagplan,section,summary);
                changedPlans[section] = summary;
                 $j("#saveme").show();
                 $j("#editmsg").html('De gule rutene er IKKE lagra');
                }
       });
     $j('.edit_area').editable( save_fagplan , {
         type      : 'textarea',
         width     : '12em',
         height    : '12em',
         style     : 'display:block',
         doformat  : translatebreaks,
         submit    : 'OK',
         indicator : '<img src="aarsplan/indicator.gif">',
         tooltip   : 'Click to edit...'
     });
}

function heldag_enable_editing() {
     $j('.edit').editable( check_heldag , {
         indicator      : 'Saving...',
         tooltip        : 'Click to edit...',
         submit         : 'OK',
         autocomplete   : fagautocomp
     });
}

function enable_editing(url) {
     $j('.edit').editable(url, {
         indicator : 'Saving...',
         tooltip   : 'Click to edit...',
         submit    : 'OK'
     });
     $j('.edit_area').editable(url, { 
         type      : 'textarea',
         width     : '12em',
         height    : '12em',
         style     : 'display:block',
         doformat  : translatebreaks,
         submit    : 'OK',
         indicator : '<img src="aarsplan/indicator.gif">',
         tooltip   : 'Click to edit...'
     });
}     

