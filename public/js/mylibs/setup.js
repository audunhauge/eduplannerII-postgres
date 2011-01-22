// set up global vars
// and connect event-handlers
// all functions must be defined before we load this file


var $j = jQuery.noConflict();
var database;           // jSON data
var brukerliste = {};   // brukerliste[elev,teach,klasse]
var valg;               // siste valg (teach,elev,klasse,sammensatt)
var user = Url.decode(gup("navn"));
var action = gup("action") || 'default';   // brukes i switch til å velge alternative visninger
var showplan  = gup("plan") || '';         // dersom ?plan=3it5_3402 da vises denne planen
   // egen var for denne slik at linken blir så kort som mulig
   // brukes til å legge inn link fra itslearning

var dager = "Man Tir Ons Tor Fre Merknad".split(" ");
var eier;               // eier av siste timeplan (navn osv)

var timetables = {};
var timeregister = {};
// timeregister lagrer timeplaner slik at de kan vises
// samlet. Alle timeplanvisere kan push/pop på denne

var valgtPlan;          // husker på den sist viste planen
var memberlist;         // liste over medlemmer i hver gruppe
var memgr;              // liste over grupper en elev er medlem av

var teachers;
var students;
var reservations;       // all reservations (future) for rooms
var id2elev;            // konverterer fra id til elevinfo
var isteach = false;    // a flag to decide if we should
  // bother displaying extra menues for a _presumed_ teacher -
  // the real test is done in php on submit
  // this is just a convenience

var isadmin = false;    //  display admin menues?
var popmemoizer = {};
var userinfo = {};
var memothisweek = '';  // remember timetable for this week (this user)

var fagplaner;          // mine fagplaner
var allefagplaner;      // alle fagplaner (pr lærer)

var siste10 = {}        // husk 10 siste timeplaner

var alleprover;         // lagrer data om alle prøver for alle elever

var fullname;           // lagrer fagnavn delen av gruppenavnet - fullname["3403"] = "3inf5"
var category;           // 3inf5:4, 2SCD5:10  - kategori for faget 2=vg1,3=vg2,4=vg3,10=mdd
var fagautocomp;        // liste over alle gyldige fagnavn - brukes til autocomplete
var linktilrom = [];    // liste over alle rom
  

function take_action() {
    // decide what to show at startup based on action parameter
    switch(action) {
        case 'raad':
            valg = 'teach';
            url = "aarsplan/php/gettimeplan.php";
            $j("#main").html('<div id="timeplan"></div>');
            filter = 'RAD';
            $j("#htitle").html("Timeplan for Wenche Mack");

            // vis wenche
            vis_valgt_timeplan({ id:1343, username:"Wench Mack"},url,filter);

            var s =   '<li class="current"><a href="#">Rådgivere</a></li>'
                    + '<li><a id="dahi" href="#">Hilde Dalen</a></li>' 
                    + '<li><a id="hasi" href="#">Sigmund Hauge</a></li>'
                    + '<li><a id="mawe" href="#">Wenche Mack</a></li>';
            $j("#nav").html(s);

            $j("#mawe").click(function(event) {
                $j("#htitle").html("Timeplan for Wenche Mack");
                event.preventDefault();
                vis_valgt_timeplan({ id:1343, username:"Wench Mack"},url,filter);
            });
            $j("#hasi").click(function(event) {
                $j("#htitle").html("Timeplan for Sigmund Hauge");
                event.preventDefault();
                vis_valgt_timeplan({ id:1358, username:"Sigmund Hauge" },url,filter);
            });
            $j("#dahi").click(function(event) {
                $j("#htitle").html("Timeplan for Hilde Dalen");
                event.preventDefault();
                vis_valgt_timeplan({ id:1328, username:"Hilde Dalen" },url,filter);
            });

            break;

        case 'reload':
            // after login - don't do anything
            break;
        case 'login':
            // go to the login page
            get_login();
            break;

        case 'plan':
            // planen er allerede på skjermen
            // en **if (action == 'default')** i setup.js
            // har unngått at vi overskriver planen
        case 'default':
        default:
            if (isteach) {
                setup_teach();
            } else if (userinfo.maybeteach) {
                $j("#login").html('login').click(function(event) {
                    event.preventDefault();
                    get_login();
                });
            } else {
                $j("#login").html('Elev');
            }
            break;
    }
}

// fetch userlist and do some more setup


function setup_teach() {
    $j("#htitle").html("Velkommen "+user);
    var romliste = { "A":("A001,A002,A003,A004,A005,A006,A102,A107".split(',')),
                     "M0":("M001,M002,M003,M004,M005,M006".split(',')),
                     "M1":("M106,M109,M110,M111,M112,M113,M117,M118,M119,B001,B002".split(',')),
                     "R0":("R001,R002,R003,R004,R005,R008".split(',')),
                     "R1":("R105,R106,R107,R110,R111,R112,R113".split(',')),
                     "R2":("R201,R202,R203,R204,R205,R206,R207,R208,R210,R211,R212,R213,R214,R215,R216".split(',')) };
    var romvalg = '<ul>';                     
    romvalg += '<li><a id="ledigrom" href="#">Finn ledig rom</a></li>'; 
    for (var i in romliste) {
        var etasje = romliste[i];
        romvalg += '<li><a href="#">' + i + 'xx</a><ul>'; 
        for (var j =0; j< etasje.length; j++) {
            var rom = etasje[j];
            romvalg += '<li><a id="rom'+rom+'" href="#">'+rom+'</a></li>'; 
            linktilrom.push(rom);
        }
        romvalg += '</ul></li>'; 
    }
    romvalg += '</ul>';
    var s = '<li><a id="romres" href="#">Romreservering</a>'+romvalg+'</li>'
            + '<li><a id="starb" href="#">Starb</a></li>';
    if (isadmin) {
        s +=  '<li><a id="rediger" href="#">Rediger</a><ul>'
            +    '<li><a id="edfridager"     href="#">Fridager</a></li>'
            +    '<li><a id="edheldag"       href="#">Heldag</a></li>'
            +    '<li><a id="edaarsplan"     href="#">Årsplan</a></li>'
            +    '<li><a id="edblokk"        href="#">Blokkskjema</a></li>'
            +    '<li><a id="edbortfall"     href="#">Bortfall</a></li>'
            +    '<li><a id="edexcurs"       href="#">Ekskursjoner</a></li>'
            + '</ul></li>';
        $j("#login").html('Admin');
    } else {
        $j("#login").html('Teach');
    }
    // legg inn clickhandler for alle rom
    // hent reserveringer for rommene
    $j.getJSON( "/reserv", 
         function(data) {
            $j("#nav").append(s);
            $j("#ledigrom").click(function() {
                findfree();
            } );
            reservations = data;
            for (var k=0; k < linktilrom.length; k++) {
                var rom = linktilrom[k];
                $j("#rom"+rom).click(function() {
                    var idd = $j(this).attr("id");
                    rom_reservering(idd.substr(3));
                } );
            }
         });
    $j("#edfridager").click(function(event) {
        event.preventDefault();
        edit_fridager();
    });
    $j("#edaarsplan").click(function(event) {
        event.preventDefault();
        edit_aarsplan();
    });
    $j("#edheldag").click(function(event) {
        event.preventDefault();
        edit_heldag();
    });
    $j("#edbortfall").click(function(event) {
        event.preventDefault();
        edit_bortfall();
    });
}


function get_login() {
    // this function is available for maybeteachers
    // if they authenticate they get expanded menu
    // NOTE: this is not security - just convenience. we only show
    // editing menues to presumed teachers.
    // The real check is performed on the node server on all
    // requests that perform changes. We just don't show menues that
    // users arn't allowed to use.
    var s = '<form name="loginform"><table id="loginform" class="gradback rcorner centered" >';
    s += '<tr><th><label for="username" >Brukernavn</label></th><td><input id="uname" type="text" name="username" value="'+userinfo.username+'"></td></tr>';
    s += '<tr><th><label for="password" >Passord</label></th><td><input id="pwd" type="password" name="password"></td></tr>';
    s += '<tr><td colspan="2"><div id="do_login" class="button">Login</div></td></tr>';
    s += '</table></form>';
    $j("#main").html(s);
    $j("#uname").keypress(function(event) {
        if (event.keyCode == "13") {
            event.preventDefault();
            $j("#pwd").focus();
        }
      }).focus();
    $j("#pwd").keypress(function(event) {
        if (event.keyCode == "13") {
            event.preventDefault();
            $j("#do_login").click();
        }
      });

    $j("#do_login").click(function(event) {
        var username = $j("#uname").val();
        var password = $j("#pwd").val();
        $j.get( '/login',{"username":username, "password":password }, function(uinfo) {
            if (uinfo && uinfo.id > 0) {
              database.userinfo = userinfo = uinfo;
              // if user.id > 0 then we are logged in
              // add new and dainty things to the menu
              // same as isteach
              if (userinfo.department == 'Undervisning') {
                fullname = userinfo.firstname + ' ' + userinfo.lastname;
                user = fullname;
                userinfo.fullname = fullname;
                isteach = true;
                isadmin = (userinfo.isadmin == 'y');
                setup_teach();
                $j("#login").unbind();
                show_thisweek();
              }
            }
        });
    });
}

var prevtitle;

function getusers() {
    // noen kjappe globale
    memberlist = database.memlist;
    memgr = database.memgr;
    heldag = database.heldag;
    category = database.category;
    fagautocomp = database.course;
    id2elev = database.students;
    teachers = database.teachers;
    students = database.students;
    studentIds = database.studentIds;
    getcourseplans();
}

function getcourseplans() {
  var url = 'allplans';
  $j.getJSON( url, 
  function(allplans) {
      allefagplaner = allplans;
      var s = '<ul>';
      var linktilfag = [];
      for (var avdeling in allefagplaner.courseplans) {
          var myteachers = allefagplaner.courseplans[avdeling];
          s += '<li><a href="#">' + avdeling + '</a><ul>';
          for (var teach in myteachers) {
              var fagene = myteachers[teach];
              s += '<li><a href="#">' + teach + '</a><ul>';
              for (var fag in fagene) {
                  var idd = fag+'z'+teach+'z'+avdeling;
                  var compliance = allefagplaner.compliance[teach][fag]; 
                  var comp = Math.floor(Math.log(1 +compliance))
                  s += '<li><a class="fag'+comp+'" id="'+idd+'" href="#">' + fag + '</a></li>';
                  linktilfag.push(idd);
              }
              s += '</ul></li>';
          }
          s += '</ul></li>';
      }
      s += '</ul>';
      $j("#andreplaner").after(s);
      for (var i=0; i < linktilfag.length; i++) {
          var fag = linktilfag[i];
          $j("#"+fag).click(function() {
              var idd = $j(this).attr("id");
              var elms = idd.split('z');
              var fagnavn = elms[0];
              var teach = elms[1];
              var avdeling = elms[2];
              var plandata = allefagplaner.courseplans[avdeling][teach][fagnavn];
              //var datoliste = allefagplaner.wdates;
              visEnPlan(fagnavn,plandata);
          } );
      }
      $j("#htitle").html(prevtitle);

  });
}            



$j(document).ready(function() {
    if (showplan != '') {
        // vi viser planen for faget først - setter opp
        // de andre fine greiene etterpå
        action = 'plan';
        plan = showplan.toUpperCase();
        var url = 'aarsplan/php/getfagplaner.php';
        $j.getJSON( url, { fagnavn:plan },
        function(data) {
            fagplaner = data;
            if (fagplaner.fagliste[plan]) {
                var plandata = fagplaner.fagliste[plan];
                var datoliste = fagplaner.wdates;
                visEnPlan(plan,plandata,datoliste);
                $j("#htitle").html("Fagplan");
            } else {
                // vi fant ingen plan - vis standard
                $j("#main").html("Ukjent plan "+plan);
                action = 'default';
                show_thisweek();
            }
        });
    
    }
    $j.getJSON( "/basic",{ navn:user }, 
         function(data) {
           database = data;
           userinfo = data.userinfo;
            // sjekk først om bruker allerede er logga inn
            $j.get( '/login', function(uinfo) {
               if (uinfo && uinfo.id > 0) {
                  // if user.id > 0 then we are logged in
                  // add new and dainty things to the menu
                  // same as isteach
                  database.userinfo = userinfo = uinfo;
                  if (userinfo.department == 'Undervisning') {
                    fullname = userinfo.firstname + ' ' + userinfo.lastname;
                    user = fullname;
                    userinfo.fullname = fullname;
                    isteach = true;
                    isadmin = (userinfo.isadmin == 'y');
                    //setup_teach();
                    $j("#login").unbind();
                    //show_thisweek();
                    take_action();
                  }
               } else {
                    userinfo = database.userinfo || { firstname:"", lastname:"", department:"", isadmin:false };
                    fullname = userinfo.firstname + " " + userinfo.lastname;
                    //isteach = (userinfo.department == 'Undervisning');
                    userinfo.maybeteach = (userinfo.department == 'Undervisning');
                    isteach = false;
                    //isadmin = userinfo.isadmin;
                    isadmin = false;
                    take_action();
                    prevtitle = $j("#htitle").html();
               }
               if (action == 'default') {
                 show_thisweek();
               }
               getusers();
            });
         });
    $j("#yearplan").click(function(event) {
        event.preventDefault();
        show_all(database.firstweek);
    });
    $j("#resten").click(function(event) {
        event.preventDefault();
        show_all(database.startjd);
    });
    $j("#hele").click(function(event) {
        event.preventDefault();
        show_all(database.firstweek);
    });
    $j("#heldag").click(function(event) {
        event.preventDefault();
        show_heldag();
    });
    $j("#alleprover").addClass("disabled");
    // this is disabled until we have loaded all tests
    // will only show if response from mysql is slow
    $j.getJSON( "/alltests", 
         function(data) {
            alleprover = data;
            $j("#alleprover").click(function(event) {
                event.preventDefault();
                show_alleprover();
            }).removeClass("disabled");
         });
    $j("#prover").click(function(event) {
        event.preventDefault();
        show_prover();
    });
    $j("#neste").click(function(event) {
        event.preventDefault();
        show_next4();
    });
    $j("#denne").click(function(event) {
        event.preventDefault();
        show_thisweek();
    }); 
    $j("#timeplaner").click(function(event) {
        event.preventDefault();
        valg = 'elev';
        vis_elevtimeplan();
    });
    $j("#timeplanelev").click(function(event) {
        event.preventDefault();
        valg = 'elev';
        vis_elevtimeplan();
    });
    $j("#timeplanteach").click(function(event) {
        event.preventDefault();
        valg = 'teach';
        vis_teachtimeplan();
    });
    $j("#timeplanklasse").click(function(event) {
        event.preventDefault();
        valg = 'klasse';
        vis_klassetimeplan();
    });
    $j("#timeplangruppe").click(function(event) {
        event.preventDefault();
        valg = 'gruppe';
        vis_gruppetimeplan();
    });
    $j("#timeplansamling").click(function(event) {
        event.preventDefault();
        valg = 'samling';
        vis_samlingtimeplan();
    });
    $j("#andreplaner").click(function(event) {
        event.preventDefault();
        vis_andreplaner();
    });
});

