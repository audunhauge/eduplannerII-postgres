// editing functions
function edit_proveplan(fagnavn,plandata) {
    // rediger prøveplanen for et fag
    minfagplan = fagnavn;
    var prover = alleprover.alleprover;
    var felms = fagnavn.split('_');
    var fag = felms[0];
    var gru = felms[1];
    var elever = memberlist[gru];
    var andrefag = [];
    var andregru = [];
    for (var eid in elever) {
        var elev = elever[eid];
        var egru = memgr[elev];
        for (var egid in egru) {
            var eg = egru[egid].split('_')[0];
            if ($j.inArray(eg,andrefag) == -1) {
                andrefag.push(eg);
            }
            var efg = egru[egid].split('_')[1];
            if ($j.inArray(efg,andregru) == -1) {
                andregru.push(efg);
            }
        }
    }
    var events = database.aarsplan;
    var thisweek = database.thisweek;
    var s = '<div id="proveplan">';
    s += '<h1>Prøveplan</h1>';
    if (isteach) {
        s += '<p id="editmsg">Du kan redigere planen ved å klikke på en rute</p>';
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
    //for (i= 0; i < plandata.length; i++) {
    for (i= 0; i < 47; i++) {
        pro = prover[i];
        e = plandata[i] || { summary:"", section:i };
        //var dato = datoliste[i] || '';
        var elm = dato.split(' ');
        var uke = elm[0] || '';
        if (+uke < 10) {
            uke = '0' + uke;
        }
        dato = elm[1] || '';
        var summary = Url.decode(e.summary);
        var oversikt = summary.replace(/\|/g,"<br>");
        oversikt = oversikt.replace(/<br><br>/g,"<br>");
        oversikt = oversikt.replace(/<br><br>/g,"<br>");
        oversikt = oversikt.replace(/<br>$/,"");
        klass = (isteach) ? ' class="edit_area"' : '';
        idd = 'wd' + uke + '_';
        s += '<tr id="section'+e.section+'">';
        s += "<th>" +'<span class="uke">' + uke + '</span> <span class="dato">' +dato+"</span></th>";
        s += '<td class="oversikt">'+ oversikt + '</td>';
        var ulist = memberlist[gru];
        for (j=0;j<5;j++) {
            var andre = '';
            var heldag = '';
            var epro   = Url.decode(pro.pr[j]).split('zz');
            var hdager = Url.decode(pro.hd[j]).split('zz');
            for (k=0; k < epro.length; k++) {
                var progro = epro[k].split('|')[0].split('_')[1];
                if (progro && $j.inArray(progro,andregru) != -1) {
                    var grlink = epro[k].split('_')[0];
                    var grheading = '<span class="uheader">' + epro[k].replace(/\|/g," ") + '</span>';
                    popup = makepop(grlink,ulist,progro,gru,'group',grheading);
                    andre += '<ul class="nav">' + popup + '</ul>';
                }
            }
            for (k=0; k < hdager.length; k++) {
                if (hdager[k] == "") continue;
                var hd = hdager[k].split('>')[1].split(' ')[0];
                if (hd  && $j.inArray(hd.toUpperCase(),andrefag) != -1) {
                    heldag += hdager[k];
                }
            }
            if (heldag) {
                s += '<td'+klass+'>' + heldag + '</td>';
            } else {
                //andre = andre.replace(/ /g,"&nbsp;");
                s += '<td'+klass+'>' + txt + andre+ '</td>';
            }
        }
        s += '</tr>';
    }
    s += "</table>";
    s += "</div>";
    $j("#main").html(s);
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
        $j.post( "/save_totfagplan", { "alltext":alltext, "courseid":courseid },
                function(data) {
                    $j("#editmsg").html(data.msg);
                    $j("#saveme").hide().addClass("button").html('Lagre');
                    $j(minVisning).click();
                });
        changedPlans = [];
    });
    var uke = database.week;
    $j("#toot").click(function() {
        var plan = visEnValgtPlan(plandata,egne,33,26);
        $j("#planviser").html(plan);
        fagplan_enable_editing(isteach,egne);
        minVisning = "#toot";
    });
    $j("#rest").click(function() {
        var plan = visEnValgtPlan(plandata,egne,uke,26);
        $j("#planviser").html(plan);
        fagplan_enable_editing(isteach,egne);
        minVisning = "#rest";
    });
    var plan = visEnValgtPlan(plandata,egne,uke,26);
    $j("#planviser").html(plan);
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
     + "<tr><th>Uke</th><th>Tema</th><th>Vurdering</th><th>Mål</th><th>Oppgaver</th><th>Logg/merk</th></tr>";
    var i,j,e,klass,idd;
    //for (i= thisweek; i < database.lastweek; i += 7) {
    var jd = database.firstweek;
    var tests =coursetests(minfagplan);
    var tjd;
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
        summary += '|||||';
        summary = summary.replace(/(<br>)+/g,"<br>");
        summary = summary.replace(/<br>$/,"");
        summary = summary.replace(/(&amp;nbsp;)+/g," ");
        var elements = summary.split('|');
        if (testweek) {
          elements[1] = $j.map(testweek,function(e,i) {
                 return '<span class="prove">prøve ' + dager[+e.day] + "dag " + e.slots + " time</span>";
              txt = "<span class=\"prove\">" + pro.shortname+ ' ' + pro.value + "</span>";
              }).join('<br>') + elements[1];
        }
        klass = (isteach && egne) ? ' class="edit_area"' : '';
        idd = 'wd' + section + '_';
        s += '<tr id="section'+section+'">';
        s += '<th><div class="weeknum">'+julian.week(tjd)+'</div><br class="clear" /><div class="date">' + formatweekdate(tjd) + "</div></th>";
        //s += "<th>" +'<span class="uke">' + uke + '</span> <span class="dato">' +dato+"</span></th>";
        s += '<td><div id="'+idd+'0" '+klass+'>' + elements[0] + "</div></td>";
        s += '<td><div id="'+idd+'1" '+klass+'>' + elements[1] + "</div></td>";
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
        cc = Url.decode(e.days[j][1]);
        var klass = (cc != 'fridag') ? 'edit_area' : cc;
        txt = Url.decode(e.days[j][0]);
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
        cc = Url.decode(e.days[j][1]);
        txt = (cc != 'normal') ? Url.decode(e.days[j][0]) : '';
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
        txt = Url.decode(e.hd[j]);
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
            var elm = $j("#"+base+i).html();
            elm = (elm == '&nbsp;') ? '' : elm;
            summary += elm + '|';
        }
    }
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

