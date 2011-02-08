// editing functions


function edit_bortfall(uid) {
    // enter dates where teach is absent
    // should we collapse planned absence for studs into this?
    // would be quite similar
    var events = database.aarsplan;
    var thisweek = database.startjd;
    var timmy = {};
    var tidy = {};
    // build timetable data for quick reference
    for (var tt in timetables.teach[uid] ) {
      var tty = timetables.teach[uid][tt];
      if (!timmy[tty[0]]) {
        timmy[tty[0]] = {};
        tidy [tty[0]] = [];
      }
      if (timmy[ tty[0] ][ tty[1] ]) continue;
      timmy[ tty[0] ][ tty[1] ] = 1;
      tidy[ tty[0] ].push(""+(1+tty[1]));
    }
    var s = '<div id="absent">';
    s += '<h1>Fraværsplan</h1>';
    s += '<p  id="editmsg"> Legg til med grønn knapper, klikk på eksisterende for å endre.</p>';
    s += '<table id="testeditor" class="gradback centered sized1 border1">';
    if (teachers[uid]) s += '<caption>' + teachers[uid].firstname + teachers[uid].lastname + '</caption>';
    if (students[uid]) s += '<caption>' + students[uid].firstname + students[uid].lastname + '</caption>';
    s += '<tr><th class="time">Uke</th><th>Man</th><th>Tir</th><th>Ons</th>';
    s += "<th>Tor</th><th>Fre</th></tr>";
    var i,j,k;
    var txt;
    var thclass;
    var cc;
    var txt = '&nbsp;';
    var e,klass,pro;
    for (var jd = thisweek; jd < database.lastweek; jd += 7 ) {
        var uke = julian.week(jd);
        var tjd = jd;
        if (+uke < 10) {
            uke = '0' + uke;
        }
        var weektest = ['','','','',''];
        var weekclass = ['','','','',''];
        for (var w=0; w<5; w++) {
          if (database.freedays[tjd+w]) {
            weektest[w] = database.freedays[tjd+w];
            weekclass[w] = 'class="fridag"';
          } else {
            weektest[w] += '<a title="Kurs" active="" rel="#testdialog" id="jdw'+(tjd+w)+"_"+w+'" class="addnew">+</a>' ;
          }
          if (absent[tjd+w]) {
            for (var a in absent[tjd+w]) {
              if (+a == +uid) {
                var ab = absent[tjd+w][a];
                var tlist = ab.value;
                if (tlist == '1,2,3,4,5,6,7,8,9'){
                  tlist = '';
                } else {
                  tlist += ' time';
                }
                weektest[w] = '<a title="'+ab.name+'" rel="#testdialog" id="jdw'+(tjd+w)+'_'+w+'" active="'+ab.value+'" class="absent">' + ab.name + " " + tlist + '</a>';
              }
            }
          }
        }
        // create the table row for this week
        s += '<tr>';
        s += '<th><div title="'+tjd+'" class="weeknum">'+julian.week(tjd)
             +'</div><br class="clear" /><div class="date">' + formatweekdate(tjd) + "</div></th>";
        for (var w=0; w<5; w++) {
          s += '<td '+weekclass[w]+'>'+weektest[w]+'</td>';
        }
        s += '</tr>';
    }
    s += "</table>";
    s += "</div>";
    // edit overlay - is shown when we click addnew or on existing test
    s += '<div class="simple_overlay" id="testdialog">'
        +  '<h1>Registrer Bortreist</h1>'
        +  '<div id="proveform"></div>'
        +  '<div class="centered sized3" >'
        +   '<form><label>&nbsp; Årsak <input id="cause" name="cause" value="Kurs" type="text" /></label></form>'
        +   '<div id="prolagre" class="close button gui float">Lagre</div> '
        +   '<div id="prohele" class="close button gui float">Hele</div> '
        +   '<div id="proavbryt" class="close button red gui float">Avbryt</div>'
        +  '</div>';
        + '</div>';

    // render the table
    $j("#main").html(s);
    // buttons for showing whole plan / from today
    var buttons = $j(".close").click(function (event) { 
        var timer = $j.map($j("table.testtime tr.trac th"),function(e,i) {
              return e.innerHTML.split(' ')[0];
           });
        var save = false;
        if (buttons.index(this) == 1) { 
           timer = [1,2,3,4,5,6,7,8,9];
           save = true;
        }
        if (buttons.index(this) == 0) { 
           save = true;
        }
        if (save) {
           $j("#editmsg").html("Lagrer valgte timer ...");
           $j.post( "/save_absent", { userid:uid, name:$j("#cause").val(),"value":timer.join(','), "jd":testjd },
              function(data) {
                $j("#editmsg").html(data.msg);
                if (data.ok) $j.getJSON( "/getabsent", 
                     function(data) {
                        absent = data;
                        edit_bortfall(uid);
                     });
              });
        } else {
           triggers.eq(1).overlay().close();
        }
    });
    var triggers = $j("a.addnew,a.absent").click(function() {
        var id = $j(this).attr('id');
        var wd = id.split('_')[1];
        var par = $j(this);
        testjd = par.attr("id");
        var actatr = par.attr("active");
        var info = par.attr("title");
        $j("#cause").val(info);
        var active = (actatr) ? actatr.split(',') : [];
        var s = bortreist(id,wd,active,tidy[wd]);
        $j("#proveform").html(s);
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

function bortreist(id,wd,active,tty) {
  // generate a table for choosing/changing slots for absent teach
  var uid = database.userinfo.id || 0;
  var timetab = timetables.teach[uid] || [];
  var slots = ['--','--','--','--','--','--','--','--','--','--'];
  for (var i = 0; i<timetab.length; i++) {
      var elm = timetab[i];
      if (+elm[0] == +wd) slots[+elm[1]+1] = elm[2];
  }
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
    s += '<tr'+( acc ? ' class="trac"' : '') +'"><th>' + i + ' time</th><td><span class="velgprove">'+slots[i]+'</span></td></tr>';
  }
  s    += '</table></div>';
  return s;
}
