// some utility functions

function formatweekdate(jd) {
    // given a julian day will return 3.4 - 9.4 
    var greg = julian.jdtogregorian(jd);
    var d1 = new Date(greg.year, greg.month-1, greg.day);
    greg = julian.jdtogregorian(jd+4);
    var d2 = new Date(greg.year, greg.month-1, greg.day);
    return "" + d1.getDate() + '.' + (d1.getMonth()+1) + '-'+d2.getDate()+ '.'  + (d2.getMonth()+1);
}    


function countme(obj) {
  var count = 0;
  for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
         ++count;
      }
  }
  return count;
}

function gup( name ) {
    // get url parameter from location href
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
      return "";
    else
      return results[1];
}
var julian = {
  greg2jul: function (mm,id,iyyy) {
      var jy,jm,jul,ja;
      if (iyyy <0) iyyy += 1;
      if (mm>2) {
       jy = iyyy;
       jm = mm+1;
      } else {
       jy = iyyy-1;
       jm = mm + 13;
      }
      jul = Math.floor(365.25*jy) + Math.floor(30.6001*jm)+id+1720995;
      if (id+31*(mm+12*iyyy) >= (15+31*(10+12*1582))) {
       ja = Math.floor(0.01 * jy);
       jul += Math.floor(2 - ja+ Math.floor(0.25* ja));
      }
      return Math.floor(jul);
  },

  jdtogregorian: function (julian) {
      var jalpha,ja,jb,jc,jd,je,id,mm,iyyy;
      if (julian >= (15+31*(10+12*1582))) {
          jalpha =  Math.floor((julian -1867216-0.25)/36524.25);
          ja = Math.floor(julian +1 + jalpha - Math.floor(0.25*jalpha));
      } else {  ja = julian; }
      jb = Math.floor(ja + 1524);
      jc = Math.floor(6680.0 + (jb-2439870-122.1)/365.25);
      jd = Math.floor(365*jc+(0.25*jc));
      je = Math.floor((jb-jd)/30.6001);
      id = Math.floor(jb - jd -Math.floor(30.6001*je));
      mm = Math.floor(je-1);
      if (mm >12) mm -= 12;
      iyyy = Math.floor(jc -4715);
      if (mm>2) iyyy -= 1;
      if (iyyy <= 0) iyyy -= 1;
      return { month:mm, day:id, year:iyyy };
  },


  w2j :function (year,week) {
      base = julian.greg2jul(1,1,year);
      rest = base % 7;
      start = base - rest;
      if (rest>3) start += 7;
      return Math.floor(start + 7*(week-1));
  },

  week : function (jd) {
      var base,rest,start,jdate;
      jd = (typeof jd != "undefined" && jd !== null) ? jd : 0;
      if (jd == 0) {
         var today = new Date();
         jdate = { month:today.getMonth()+1, day: today.getDate(),  year:today.getFullYear() };
         jd = julian.greg2jul(jdate.month,jdate.day,jdate,year);
      } else {
         jdate = julian.jdtogregorian(jd);
      }
      base = julian.greg2jul(1,1,jdate.year);
      rest = base % 7;
      start = base - rest;
      if (rest>3) start += 7;
      if (jd < start) return 0;
      return 1 + Math.floor((jd - start) / 7);
  }

}

var Url = {
    encode : function (string) {
        return escape(this._utf8_encode(string));
    },
    decode : function (string) {
        return this._utf8_decode(unescape(string));
    },
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while ( i < utftext.length ) {
            c = utftext.charCodeAt(i);
            if (c == 94) c = 32;
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
}

