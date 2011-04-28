// static data that doesnt need to be stored i db
//   list of rooms


var roomliste = { "A" :("A001,A002,A003,A004,A005,A006,A102,A107".split(',')),
                 "M0":("M001,M002,M003,M004,M005,M006".split(',')),
                 "M1":("M106,M109,M110,M111,M112,M113,M117,M118,M119,B001,B002".split(',')),
                 "R0":("R001,R002,R003,R004,R005,R008".split(',')),
                 "R1":("R105,R106,R107,R110,R111,R112,R113".split(',')),
                 "R2":("R201,R202,R203,R204,R205,R206,R207,R208,R210,R211,R212,R213,R214,R215,R216".split(',')) };

var allrooms = [];
(function () {
  for (var gr in roomliste) {
    var grr = roomliste[gr];
    for (var id in grr) {
      var navn = grr[id];
      allrooms.push(navn);
    }
  }
})();

// standard timeslots for lesson-slots
var slotlabels = '8.05-8.45,8.45-9.25,9.35-10.15,10.20-11.00,11.25-12.05,12.10-12.50,12.50-13.30,'
               + '13.40-14.20,14.25-15.05,15.05-15.30,15.30-16.00,16.00-16.30,16.30-17.00,17.00-17.30,'
               + '17.30-18.00,18.00-18.30,18.30-19.00,19.00-19.30,19.30-20.00,20.00-20.30,20.30-21.00';


var roominfo = {};
roominfo["M119"] = { slots:21, restrict:"brer6257".split(',') };
roominfo["B001"] = { slots:21, restrict:"brer6257".split(',') };
roominfo["B002"] = { slots:21, restrict:"brer6257".split(',') };
//console.log(roominfo);
module.exports.roomdata = { roomliste:roomliste, allrooms:allrooms, slotlabels:slotlabels, roominfo:roominfo };
