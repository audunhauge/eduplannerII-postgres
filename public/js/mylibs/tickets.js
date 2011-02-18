// create and edit shows
// sell tickets

function editshow(userid) {
   userid += 31415;
   userid *= 2;
   window.location = 'http://www.skeisvang-moodle.net/moodle/flex/rediger.php?uuid='+userid;
}

function tickets(userid) {
  $j.get( '/show', function(showlist) {
    show = showlist;
    var s = '<h1 id="showtitle">Billettsalg</h1>';
    s += ''
    + ' <div id="ramme" class="border1 sized1 gradback centered" >'
    + '   <h3> Selg billetter</h3>'
    + '   <div id="showlist">'  
    + '   </div>'
    + '   <div id="salg" >'  
    + '   </div>'
    + '   <div id="accu" >'  
    + '   </div>'
    + ' </div>';
    $j("#main").html(s);
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
        var myid = $j(this).attr("id");
        var idx = $j(this).attr("ref");
        salg(userid,myid,idx);
    });
  });
  
  
}


function salg(userid,showid,idx) {
  $j.get( '/tickets', {showid:showid },function(tickets) {
    var tsum = 0;
    var antall = 0;
    var kksum = { kort:0, kontant:0 };
    var s = '';
    var kk = 'kort';
    var vb = 'voksen';
    var kk_fsm = { kort:'kontant', kontant:'kort' };
    var vb_fsm = { barn:'voksen', voksen:'barn' };
    for (var i in tickets) {
       if (+i < database.startjd - 14) {
         var tics = tickets[i];
            for (var j in tics) {
                ti = tics[j];
                //s += '<li>'+ ti.kk + ' ' + ti.ant + ' ' + ti.price + ' ' + ti.showtime + ' ' + ti.saletime + '</li>';
                antall += +ti.ant;
                tsum += +ti.ant * +ti.price;
                kksum[ti.kk] += +ti.ant * +ti.price;
            }
       }
    }
    var mylist = show[userid];
    ashow = mylist[idx];
    var showtimes = ashow.showtime.split(',');
    var st = showtimes[0];
    var stidx = 0;
    s += 'Antall '+antall+' Totalsum ' + tsum;
    s += '<br>Kontant '+kksum.kontant+' Kort ' + kksum.kort;
    s += '<div id="kort" class="button bigbu">Kort</div>';
    s += '<div id="voksen" class="button bigbu">Voksen</div>';
    s += '<div id="showtime" class="button bigbu">'+st+'</div>';
    s += '<div id="selg" class="button blue">Selg</div>';
    $j("#salg").html(s);
    $j("#showtitle").html(ashow.name);
    $j("#showtime").click(function(event) {
       stidx = (stidx +1) % showtimes.length;
       st = showtimes[stidx];
       $j(this).html(st);
    });
    $j("#voksen").click(function(event) {
       vb = vb_fsm[vb];
       $j(this).html(vb);
    });
    $j("#kort").click(function(event) {
       kk = kk_fsm[kk];
       $j(this).html(kk);
    });
    $j("#selg").click(function(event) {
       $j("#accu").append(' solgt '+st+vb+kk);
    });
  });
}
