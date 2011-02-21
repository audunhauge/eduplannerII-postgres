// create and edit shows
// sell tickets

function editshow(userid) {
   userid += 31415;
   userid *= 2;
   window.location = 'http://www.skeisvang-moodle.net/moodle/flex/rediger.php?uuid='+userid;
}

var accu = {}; // accumulatoren for salg
var selectedshow = '';
var selectedprice = '';
var pricecost = {};  // stores price of show indexd by showname
var showid;
var idx;
var sold = []; // accu for performed sales
var kksum;

function tickets(userid) {
  selectedshow = '';
  selectedprice = '';
  pricecost = {};  // stores price of show indexd by showname
  accu = {};
  $j.get( '/show', function(showlist) {
    show = showlist;
    accu = {};
    var s = '<h1><a class="button" href="#" id="showtitle">Billettsalg</a></h1>'
    + '<div class="simple_overlay" id="summary"><div id="summarytext">Her har vi det</div><div id="closer"></div></div>'
    + ' <div id="ramme" class="border1 sized1 gradback centered" >'
    + '   <h3> Velg show</h3>'
    + '   <div id="showlist">'  
    + '   </div>'
    + '   <div id="salg" >'  
    + '   </div>'
    + '   <div id="userchoice" >'  
    + '   </div>'
    + '   <ul id="accu" >'  
    + '   </ul>'
    + '   <div id="bekreft" >'  
    + '     <table>'
    + '     <tr><td><div id="kort" class="betaling button bigbu blue">Kort</div></td>'
    + '         <td><div id="kontant" class="betaling button bigbu blue">Kontant</div>    </td></tr>'
    + '     </table>'
    + '   </div>'
    + ' </div>';
    $j("#main").html(s);
    $j("#showtitle").click(function(event) {
        event.preventDefault();
        $j("#summary").toggle();
      });
    $j("#closer").click(function() {
        $j("#summary").hide();
      });


    s = '';
    for (var sho in [1,2,3,4]) {
       s += '<div id="sho'+sho+'" class="showtime bigbu blue button">show</div>';
    }
    s += '<p>';
    for (var pri in [1,2,3,4]) {
       s += '<div price="" id="pri'+pri+'" class="voksen bigbu  blue button">pris</div>';
    }
    $j("#salg").html(s);
    $j(".showtime").hide().click(function(event) {
       var myid = $j(this).attr("id");
       $j(".showtime").removeClass("chosen");
       $j(this).addClass("chosen");
       selectedshow = $j(this).html();
       showchoice();
     });
    $j(".voksen").hide().click(function(event) {
       var myid = $j(this).attr("id");
       $j(".voksen").removeClass("chosen");
       $j(this).addClass("chosen");
       selectedprice = $j(this).html();
       showchoice();
       updateTicketCount(1);
       showaccu();
     });
    $j("#bekreft").hide();
    var mineshow = '<ul>';
    var mylist = show[userid] || [];
    for (var i in mylist) {
       ashow = mylist[i];
       mineshow += '<li><a ref="'+i+'" href="#" class="show" id="'+ashow.idx+'">' + ashow.name + '</a></li>';
    }
    mineshow += '</ul>';
    $j("#showlist").html(mineshow);
    $j(".show").click(function(event) {
        event.preventDefault();
        if ($j("#showlist").hasClass("murky")) return;
        selectedshow = '';
        selectedprice = '';
        $j("#userchoice").html('');
        showid = $j(this).attr("id");
        idx = $j(this).attr("ref");
        var mylist = show[userid];
        var ashow = mylist[idx];
        $j("#showtitle").html(ashow.name);
        salg(userid,showid,idx);
    });
    $j(".betaling").click(function() {

        $j("#bekreft").hide();
        $j("#salg").hide();
        $j(".voksen").removeClass("chosen");
        $j(".showtime").removeClass("chosen");
        selectedshow = '';
        selectedprice = '';
        var mylist = show[userid];
        var ashow = mylist[idx];
        var type =$j(this).html();
        if (!sold[ashow.name]) sold[ashow.name] = [];
        sold[ashow.name].push({acc:accu, time:new Date(), type:type, pricecost:pricecost });
        showsummary(ashow.name);
        var accumul = [];
        for (var asho in accu) {
            for (var apri in accu[asho]) {
                var antb = accu[asho][apri];
                if (antb == undefined) continue;
                if (+antb != 0) {
                   accumul.push(asho+','+pricecost[apri]+','+antb);
                }
            }
        }
        if (accumul.length > 0) {
          $j("#accu").html('<li>Lagrer data ....</li>');
          $j.post('/buytickets',{showid:ashow.idx, accu:accumul.join('|'), type:type },function(resp) {
               $j("#salg").show(); 
               var s = resp.msg;
               $j("#accu").html(s);
               $j("#showlist").removeClass("murky");
               accu = {};
            });
        } else {
          $j("#accu").html('Ingen data å lagre');
          $j("#salg").show(); 
          $j("#showlist").removeClass("murky");
          accu = {};
        }

      });
  });
  
  
}

function showsummary(showname) {
    var s = '<h3>'+showname+'</h3>'
      +  '<table class="summary"><caption>Siste 14 dager</caption><tr><td>Kort</td><td>'+kksum.kort+' kr</td><td>Kontant</td><td>'+kksum.kontant+' kr</td></tr></table>'
      + '<table class="summary">'
      + '<caption>Solgt denne omgang</caption>';
    var tsum=0;
    for (var aki in sold[showname]) {
        var akko = sold[showname][aki].acc;
        var time = sold[showname][aki].time;
        var type = sold[showname][aki].type;
        var pc = sold[showname][aki].pricecost;
        var sum=0;
        for (var asho in akko) {
            for (var apri in akko[asho]) {
                var antb = akko[asho][apri];
                if (+antb != 0) {
                   sum += +antb * +pc[apri];
                }
                s += '<tr><td>' + akko[asho][apri] + '</td><td>' + apri + '</td><td>'+ asho + '</td>' + '</tr>'; 
            }
        }
        s += '<tr><th>'+type+'</th><th>'+sum+'kr</th><th>'+time.toLocaleTimeString()+'</th></tr>';
        tsum += sum;
    }
    s += '<tr><td>Totalt</td><td>'+tsum+' kr</td><td></td></tr>';
    s += '</table>';
    $j("#summarytext").html(s);
}

function showchoice() {
    var ss = (selectedshow) ? selectedshow : 'ikke valgt';
    $j("#userchoice").html('Valgt forestilling : '+ss);
}

function updateTicketCount(delta) {
    if (selectedshow && selectedprice) {
        if (!accu[selectedshow]) accu[selectedshow] = {};
        if (!accu[selectedshow][selectedprice]) accu[selectedshow][selectedprice] = 0;
        accu[selectedshow][selectedprice] += +delta;
    }
}

function showaccu() {
    var s = '<table id="accutab">';
    var sum = 0;
    if (selectedshow && selectedprice) {
        for (var asho in accu) {
            for (var apri in accu[asho]) {
                klass = '';
                var antb = accu[asho][apri];
                if (+antb != 0) {
                   sum += +antb * +pricecost[apri];
                }
                if (apri == selectedprice && asho == selectedshow) {
                    klass= 'accu ';
                }
                s += '<tr id="acc,'+asho+','+apri+'" class="'+klass+'regline"><td>' + accu[asho][apri] + '</td><td>' + apri + '</td><td>'+ asho + '</td>'
                    + '<td class="increment">+</td><td class="decrement">-</td>'
                    + '</tr>'; 
            }
        }
        s += '</table>';
        s += '<h3>TotalPris: '+sum+'kr</h3>';
        $j("#accu").html(s);
        $j(".increment").click(function() {
            var myid = $j(this).parent().attr("id");
            selectedshow = myid.split(',')[1];
            selectedprice = myid.split(',')[2];
            updateTicketCount(1);
            showaccu();
          });
        $j(".decrement").click(function() {
            var myid = $j(this).parent().attr("id");
            selectedshow = myid.split(',')[1];
            selectedprice = myid.split(',')[2];
            updateTicketCount(-1);
            showaccu();
          });

        $j("#showlist").addClass("murky");
        $j("#bekreft").show();
    } else {
        $j("#showlist").removeClass("murky");
        $j("#bekreft").hide();
    }
}



function salg(userid,showid,idx) {
  $j.get( '/tickets', {showid:showid },function(tickets) {
    var tsum = 0;
    var antall = 0;
    kksum = { kort:0, kontant:0 };
    var s = '';
    for (var i in tickets) {
       if (+i > database.startjd - 14) {
         var tics = tickets[i];
            for (var j in tics) {
                ti = tics[j];
                antall += +ti.ant;
                tsum += +ti.ant * +ti.price;
                kksum[ti.kk.toLowerCase()] += +ti.ant * +ti.price;
            }
       }
    }
    var mylist = show[userid];
    ashow = mylist[idx];
    showsummary(ashow.name);
    $j(".voksen").hide();
    $j(".showtime").hide();
    var showtimes = ashow.showtime.split(',');
    for (var sho in showtimes) {
       var shoo = showtimes[sho];
       $j("#sho"+sho).show().html(shoo);
    }
    var pricelist = ashow.pricenames.split(',');
    for (var pri in pricelist) {
       var price = pricelist[pri].split(':')[0];
       var cost = pricelist[pri].split(':')[1];
       pricecost[price] = cost;
       $j("#pri"+pri).show().html(price).attr("price",cost);
    }
  });
}

