var users = {
  'audun' : 'haau6257'
};
var crypto = require('crypto');
module.exports.authenticate = function(client, login, password, callback) {

  var username = users[login] || login;
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
                if (md5pwd == user.password) {
                    callback(user);
                    return;
                }
          }
          callback(null);
      });
};
