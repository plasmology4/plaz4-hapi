const ActiveDirectory = require('activedirectory');

const adConfig = { url: 'ldap://zeus-dc.plasmology4.com',
                   baseDN: 'dc=plasmology4,dc=com',
                   username: 'LDAPAdmin@plasmology4.com',
                   password: 'Look4Info' }


const ad = new ActiveDirectory(adConfig);

// Test we can connect to Active Directory 
ad.authenticate (adConfig.username, adConfig.password, function(err, auth) {
  if (err) {
    console.log('ERROR: '+JSON.stringify(err));
    return;
  }

  if (auth) {
    console.log('LDAP User Authenticated!');
  }
  else {
    console.log('LDAP Authentication failed!');
  }
});

// Wrap the authenticate method
exports.authenticate = function(username, password, callback) {
  return ad.authenticate(username, password, callback);
};


/*
 * Acitve Directory Routes
 */
server.route(
  [{
    method: 'GET',
    path: '/ad-test',
    config: { auth: false },
    handler: function(request, reply) {
      var query = 'cn=*Rich*';
      var sAMAccountName = 'rich.john';
      //var query = 'cn=users,dc=plasmology4,dc=com';
      ad.findUser(sAMAccountName, function(err, users) {
      //ad.findUsers(query, function(err, users) {
        if (err) {
          console.log('ERROR: ' +JSON.stringify(err));
          return;
        }

        if ((! users) || (users.length == 0)) {
          console.log('No users found.');
          reply('No users found.');
        }
        else {
          console.log('findUsers Results: '+JSON.stringify(users));
          reply(JSON.stringify(users));
        }
      });
    }
  }, {
    method: 'GET',
    path: '/ad/user/{id}',
    config: { auth: 'jwt' },
    handler: function(request, reply) {
    
    console.log("Getting User Info...");
         

    if (request.params.id) {
        console.log("Getting User Info for ID::" + request.params.id);
        var sAMAccountName = request.params.id;
        //var query = 'cn=users,dc=plasmology4,dc=com';
        ad.findUser(sAMAccountName, function(err, users) {
        //ad.findUsers(query, function(err, users) {
          if (err) {
            console.log('ERROR: ' +JSON.stringify(err));
            return;
          }

          if ((! users) || (users.length == 0)) {
            console.log('No users found.');
            reply('No users found.');
          }
          else {
            console.log('findUsers Results: '+JSON.stringify(users));
            reply(JSON.stringify(users));
          }
        });
      } else {
        reply({msg: "No user id given"});
      }
    }
  }, {
    method: 'GET',
    path: '/ad/user/{id}/groups',
    config: { auth: 'jwt' },
    handler: function(request, reply) {
    
    console.log("Getting User Groups Info...");
         

    if (request.params.id) {
        console.log("Getting User Group Info for ID::" + request.params.id);
        var sAMAccountName = request.params.id;
        ad.getGroupMembershipForUser(sAMAccountName, function(err, groups) {
        //ad.findUsers(query, function(err, groups) {
          if (err) {
            console.log('ERROR: ' +JSON.stringify(err));
            return;
          }

          if ((! groups) || (groups.length == 0)) {
            console.log('No groups found.');
            reply('No groups found.');
          }
          else {
            console.log('findUser Groups Results: '+JSON.stringify(groups));
            reply(JSON.stringify(groups));
          }
        });
      } else {
        reply({msg: "No user id given"});
      }
    }
  }]
);
