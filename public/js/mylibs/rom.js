// funksjoner for å vise romreservering


function rom_reservering(rom) {
    // vis timeplan for rom med reserveringer
    var s = '<div class="sized1 centered gradback">'
            + '<table class="sized2 centered border1">'
            + '<caption>' + rom + '</caption>'
            + '<tr><th class="time">Time</th><th>Man</th><th>Tir</th><th>Ons</th>'
            + '<th>Tor</th><th>Fre</th></tr>';
    for (i= 0; i < 15; i++) {
      s += "<tr>";
      s += "<th>"+i+"</th>";
      for (j=0;j<5;j++) {
        var txt = '&nbsp;';
        s += '<td class="">' + txt + "</td>";
      }
      s += "</tr>";
    }
    s += "</table></div>";
    $j("#main").html(s);
}


