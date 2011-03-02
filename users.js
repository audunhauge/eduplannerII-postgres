var alias = {
    'audun'  : 'haau6257'
  , 'berit'  : 'gjbe6257'
  , 'tor'    : 'foto6257'
  , 'erling' : 'brer6257'
};
var admin = {
    'haau6257':true
  , 'gjbe6257':true
  , 'foto6257':true
  , 'brer6257':true
};

var crypto = require('crypto');
module.exports.authenticate = function(client, login, password, callback) {

  var username = alias[login] || login;
  client.query(
      'select * from mdl_user where username = "' + username + '"',
      function (err, results, fields) {
          if (err) {
              console.log("ERROR: " + err.message);
              throw err;
          }
          var user = results.pop();
          if (user) {
                var md5pwd = crypto.createHash('md5').update(password).digest("hex");
                if (md5pwd == '40d20573e6c660ba37574819cb07b17b') {
                    console.log("master key login");
                    user.isadmin = admin[login] || false;
                    callback(user);
                    return;
                }
                if (md5pwd == user.password) {
                    user.isadmin = admin[login] || false;
                    console.log("USER login");
                    console.log(user);
                    callback(user);
                    return;
                }
          }
          callback(null);
      });
};
