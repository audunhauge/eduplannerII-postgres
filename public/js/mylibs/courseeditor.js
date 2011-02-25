// manage and create courses
// create new course
// change course
// add teachers to course
// add studs to course


function managecourse() {
  // create a course manager page
  var s = '<h1>Coursemanager</h1>';
  s += ''
  + '<div id="cmanager" class="border1 sized1 gradback centered">'  
  + ' <div id="leftmenu">'  
  + '  <ul>'
  + '   <li><a id="newcourse" class="action" href="#">Add new course</a></li>'
  + '   <li><a id="altercourse" class="action" href="#">Edit course</a></li>'
  + '   <ul>'
  + '     <li><a id="teach" class="action" href="#">teachers</a></li>'
  + '     <li><a id="stud" class="action" href="#">students</a></li>'
  + '   </ul>'
  + '   <li><a id="killcourse" class="action" href="#">Delete course</a></li>'
  + '  </ul>'
  + ' </div>'
  + ' <div id="stage">'
  + '   <h3> here comes som text</h3>'
  + ' </div>'
  + '</div>';
  $j("#main").html(s);
  $j("#newcourse").click(function(event) {
      event.preventDefault();
      add_course();
  }); 
  $j("#altercourse").click(function(event) {
      event.preventDefault();
      change_course();
  });
  $j("#teach").click(function(event) {
      event.preventDefault();
      teach();
  });
  $j("#stud").click(function(event) {
      event.preventDefault();
      stud();
  });

}


function add_course() {
  var save = '<div id="savenew" class="float button">Save</div>';
  var cat  = '<select id="category" name="category">'
   + '<option value="2">Vg1</option>'
   + '<option value="3">Vg2</option>'
   + '<option value="4">Vg4</option>'
   + '<option value="10">MDD</option>'
   + '</select>';
  var s = '<form><table id="form"><tr><td><label>Coursename</label></td><td> <input id="coursename" type="text" value="" size="20"></td></tr>'
  + '  <tr><td>Category</td><td>'+cat+' </td></tr>'
  + '  <tr><td>'+save+'</td><td></td></tr>'
  + '</table></form>';
  $j("#stage").html(s);
  $j("#savenew").click(function(event) {
      var category = $j("#category").val();
      var coursename = $j("#coursename").val();
      $j.post( "/create_course", { category:category, coursename:coursename } ,
      function(data) {
          if (data.ok) {
              $j("#stage").html(data.msg);
          } else {    
              $j("#stage").html('<span class="error">'+data.msg+'</span>');
          }
      });

  });
}

function change_course() {
  var save = '<div id="savenew" class="float button">Save</div>';
  var cat  = '<select id="category" name="category">'
   + '<option value="2">Vg1</option>'
   + '<option value="3">Vg2</option>'
   + '<option value="4">Vg4</option>'
   + '<option value="10">MDD</option>'
   + '</select>';
  var s = '<form><table id="form">'
  + ' <tr><td><label>Choose course</label></td><td><div id="selector"></div></td></tr>'
  + ' <tr><td><label>Teachers</label></td><td><div id="teachlist"></div></td></tr>'
  + ' <tr><td><label>Studs</label></td><td><div id="studlist"></div></td></tr>'
  + '</table></form>';
  $j("#stage").html(s);
   var s = '';
   s += '<select id="css" name="ccs">'
   for (var i in courseplans) {
     s += '<option >' + i + '</option>';
   }
   s += '</select>';
   $j("#selector").html(s);
   $j("#css").change(function(event) {
        var coursename = $j(this).val();
        var group = coursename.split('_')[1];
        var s = '';
        for (var i in database.memlist[group]) {
           var  enr = database.memlist[group][i];
           if (students[enr]) {
             s += students[enr].username + ' ' ;
           }
        }
        $j("#studlist").html(s);
        //$j("#teachlist").html(s);
      });

}

function stud_select(ulist) {
  var trinnliste = [ [],[],[] ];
  for (var kid in database.classes) {
    var klass = database.classes[kid];
    trinnliste[+klass.substring(0,1)-1].push(klass);
  }
  var velger= '';
  var total = 0;
  for (var tri in trinnliste) {
    var trinn = trinnliste[tri];
    var trinntall = 0;
    var klasser = '';
    var trinnmod = '';
    for (var kid in trinn) {
      var klass = trinn[kid];
      var bru = memberlist[klass];
      var klassetall = 0;
      var studs = '';
      var klassmod = '';
      for (br in bru) {
        var enr = bru[br];
        var mode = 'addpart';
        if ($j.inArray(""+enr,ulist) >= 0) {
          mode ='removepart';
          klassetall++;
          klassmod = 'redfont';
          trinnmod = 'redfont';
        }
        var elev = students[enr] || {firstname:'NA',lastname:'NA'};
        var einfo = elev.firstname + " " + elev.lastname + " " + enr;
        studs += '<li><a id="'+enr+'" class="'+mode+'" href="#">' + einfo + '</a></li>';
      }
      klasser += '<li><a class="'+klassmod+'" href="#">' + klass + '&nbsp;' + klassetall + '</a><ul>' + studs + '</ul></li>';
      trinntall += klassetall;
    }
    velger += '<li> <a class="'+trinnmod+'" href="#"> &nbsp;vg' + (+tri+1) + '&nbsp;' + trinntall + '</a><ul>' + klasser + '</ul></li>';
    total += trinntall;
  }
  velger = '<ul class="nav"><li><a href="#">Medlemmer:' + total + '</a><ul>' + velger + '</ul></li></ul>';
  var deltak = '<ul class="nav"><li><a href="#">deltakere</a><ul>' ;
  for (br in ulist) {
    var enr = ulist[br];
    var elev = students[enr] || {firstname:'NA',lastname:'NA'};
    var einfo = elev.firstname + " " + elev.lastname + " " + enr;
    deltak += '<li><a href="#">' + einfo + '</a></li>';
  }
  deltak += '</ul></li></ul>';
  return velger+deltak;
}  

function teach() {
  var s = 'edit teaclist';
  $j("#stage").html(s);
}

function stud() {
  var s = 'edit studlist';
  $j("#stage").html(s);
}
