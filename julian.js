var pub = {
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
      base = pub.greg2jul(1,1,year);
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
         jd = pub.greg2jul(jdate.month,jdate.day,jdate,year);
      } else {
         jdate = pub.jdtogregorian(jd);
      }
      base = pub.greg2jul(1,1,jdate.year);
      rest = base % 7;
      start = base - rest;
      if (rest>3) start += 7;
      if (jd < start) return 0;
      return 1 + Math.floor((jd - start) / 7);
  }

}

module.exports = pub;
