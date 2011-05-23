// simply get yearplan data and show for this week
// used as a popup on itslearning
// must be small and agile

var $j = jQuery.noConflict();
var yearplan;           
var heldag;           
var dager = "Man Tir Ons Tor Fre Merknad".split(" ");




$j(document).ready(function() {
    $j.get( "/yyear", 
         function(data) {
           yearplan = data;
           var thisweek = data.start;
           $j.get( "/getexams", 
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
            //var cat = +database.category[f] || 0
            var cat = 0;
            header[j] += '<li class="catt'+cat+'">'+f+'&nbsp;'+hd[f]+'</li>';
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
