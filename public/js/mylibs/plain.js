// simply get yearplan data and show for this week
// used as a popup on itslearning
// must be small and agile

var $j = jQuery.noConflict();
var yearplan;           
var heldag;           
var dager = "Man Tir Ons Tor Fre Merknad".split(" ");

var category = { "1BEV2":11, "1BID5":4, "1DAT5":11, "1ENG5":2, "1FR24":2, "1GEO2":1, "1KRO2":4, "1LYT2":10, "1MDD5":11, 
    "1MP5":1, "1MT5":1, "1MUS5":10, "1NAT5":1, "1NOR4":2, "1SFF3":3, "1SP24":2, "1TEN5":12, "1TY14":2, "1TY24":2, 
    "2BID5":4, "2BIO5":1, "2DAP5":11, "2EB12":11, "2FR24":2, "2FYS5":1, "2GEO2":1, "2GEO5":1, "2GTD2":11, "2HFI5":3, "2HIS2":3, 
    "2IEN5":2, "2INF5":1, "2KJE5":1, "2KRO2":4, "2MAP3":1, "2MAR5":1, "2MAS5":1, "2MFD5":10, "2MIK5":3, "2MP15":10, "2NOR4":3, 
    "2OKS5":3, "2RTL5":3, "2SCD5":11, "2SDF5":11, "2SFF3":3, "2SGE5":3, "2SP24":2, "2SSA5":3, "2TEB2":11, "2TEF5":12, "2TEP5":12, 
    "2TFO5":1, "2TIP5":12, "2TY14":2, "2TY24":2, "3BIO5":1, "3DAP5":11, "3EB12":11, "3ELK5":2, "3FYS5":1, "3GEOF5":1, 
    "3GTD2":11, "3HFI5":3, "3HIS4":3, "3IKS5":10, "3INF5":1, "3IOL5":12, "3KJEM5":1, "3KRO2":4, "3MAR5":1, "3MAS5":1, "3MFD5":10, 
    "3MIK5":3, "3MP15":10, "3NOR6":2, "3OKL5":3, "3PMR5":3, "3REL3":3, "3RTL5":3, "3SAE5":3, "3SCD5":11, "3SDA5":11, "3SDF5":11, 
    "3TEB2":11, "3TEF5":12, "3TEP5":12, "3TFO5":1, "3TIP5":12, "ENSE2":10, "KOMO":20 };




$j(document).ready(function() {
    $j.get( "/yyear", { "quick":"true" },
         function(data) {
           yearplan = data;
           var thisweek = data.start;
           $j.get( "/getexams", { "quick":"true" },
               function(data) {
                 heldag = data;
                 var s = getYearPlanThisWeek(thisweek);
                 $j("#main").html(s);
           });
         });
});

function getYearPlanThisWeek(thisweek) {
  // fetch weekly summary from yearplan
    var s = '<table id="plain" class="timeplan" >';
    var header = [];
    e = yearplan[Math.floor(thisweek/7)] || { days:[]} ;
    for (var j=0;j<6;j++) {
        header[j] = e.days[j] || '';
        var hd = heldag[thisweek+j];
        if (hd) {
          header[j] += '<ul class="hdliste">';
          for (var f in hd) {
            f = f.toUpperCase();
            var cat = +category[f] || 0;
            header[j] += '<li class="catt'+cat+'">'+f+'&nbsp;'+hd[f].value+'</li>';
          }
          header[j] += '</ul>';
        }
    }
    s += "<tr>";
    for (i=0;i<6;i++) {
        s += "<th>" + dager[i] + "</th>";
    }
    s += "</tr>";
    s += "<tr>";
    for (i=0;i<6;i++) {
        s += "<th class=\"dayinfo\">" + header[i] + "</th>";
    }
    s += "</tr></table>";
    return s;
}
