/// import a json file containing some of:
// { 
//    student:[ stuobj1 , stuobj2, ... ],
//    teacher:[ teachobj1, teachbj2, ... ],
//    room:[ itemobj ],
//    course:[ courseobj ],
//    subject:[ subjobj ],
//    groups:[ groupobj ]
// }
//
// studobj : {
//   importid,username,firstname,lastname,department,institution,password,email
// }
//
// teachobj : {
//   username,firstname,lastname,department,institution,password,email
// }
//
// courseobj : {
//   shortname,fullname,description,category,
//   teachlist:[ tid,tid, ... ]
// }
//
// itemobj : {
//   name,type,properties
//   }
//
// subjobj : {
//   name,description
// }
//
// groupobj : {
//   name,members:{ stuid, stuid, ... }
//   }
//
//   stuid is importid of student
//   it is not used as key after import
//   just to tie a new stud to group
//
//   tid is importid of teacher
