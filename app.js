'use strict';

const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const Good = require('good');
const Fs   = require('fs');
const JWT  = require('jsonwebtoken');

const app = require('app-hapi');    // Application Routes - Require Authentication
const acct = require('plaz4-acct-hapi');    // Accounting Routes - Require Authentication

// Authentication
const authService = require('app-hapi');  // Active Directory Authentication
//const authService = require('./adAuth');  // Active Directory Authentication


const secret = "WapitiWapitiElkWapitiWapitiElk";

const config = {
    host: 'localhost',
    http: { 
      port: 3030, 
      routes: { cors: true, log: true } 
    },
    https: {
      port: 3443,
      key: Fs.readFileSync('../plaz4-ssl/key.pem'),
      cert: Fs.readFileSync('../plaz4-ssl/server.crt')
    }
}

const server = new Hapi.Server();


var validate = function (decoded, request, callback) {
    console.log("validating !!!");
    console.log("decoded token: "+JSON.stringify(decoded));

    // do your checks to see if the person is valid 
    var username = decoded.username;
    var password = decoded.password;

    authService.authenticate(username, password, function(err, auth) {
      if (err) {
        console.log('ERROR: '+JSON.stringify(err));
        return callback(null, false);
      }

      if (auth) {
        return callback(null, true);
      }
      else {
        return callback(null, false);
      }
    });
};


// https connection
server.connection({
  port: config.https.port,
  tls: {
    key: config.https.key,
    cert: config.https.cert
  }
});

// http connection
server.connection({ 
  port: config.http.port, 
  routes: config.http.routes
});


const options = {
  info: {
    'title': 'Plaz4 Plasmos API Documentation',
    'version': Pack.version,
  }
};

server.register([
    Inert,
    Vision,
    {
        'register': HapiSwagger,
        'options': options
    }], (err) => {
        // server.start( (err) => {
        //    if (err) {
        //         console.log(err);
        //     } else {
        //         console.log('Server running at:', server.info.uri);
        //     }
        // });
    });

// The server root route
server.route({
  method: 'GET',
  path: '/',
  handler: function(request, reply) {
    reply('Plasmology4 API');
  }
});

server.register(require('hapi-auth-jwt2'), function (err) {
 
    if(err){
      console.log(err);
    }
 
    server.auth.strategy('jwt', 'jwt',
    { key: secret,          // Never Share your secret key 
      validateFunc: validate,            // validate function defined above 
      verifyOptions: { algorithms: [ 'HS256' ] } // pick a strong algorithm 
    });
 
    //server.auth.default('jwt');
 
    server.route([
      {
        method: 'POST', 
        path: '/auth', 
        config: { 
          auth: false,
          notes: 'Recevies the session login credentials, and return the token.',
          tags: ['api'],
        },
        handler: function(request, reply) {
          
          console.log("request payload:"+JSON.stringify(request.payload));

          var username = request.payload.username;
          var password = request.payload.password;

          // Authenticate the username and password
          console.log('Authenticating: '+username+'/'+password);
          authService.authenticate(username, password, function(err, auth, user) {
            
            // Did not authenticate, return an error
            if (err) {
              console.log('ERROR: '+JSON.stringify(err));
              return reply({success: false,
                     message: 'User authentication error: '+JSON.stringify(err) }, 
                    false);
            }

            if (auth) {
              // if user is found and password is right
              // create a token
              console.log('User Authenticated...returning token');
              console.log("user: "+JSON.stringify(user));
              var token = JWT.sign({ username: username, password: password }, secret, { expiresIn: '1h' });

              // return the information including token as JSON
              return reply({
                success: true,
                user: user,
                message: 'User authentication successful, Enjoy your token!',
                token: token
              });

            }
            else {
              console.log('User Authentication Failed...returning message');
              return reply({
                success: false,
                message: 'User authentication failed!'
              });
            }

          });
        }
      }, 
      {
        method: 'GET', 
        path: '/session', 
        config: { 
          auth: 'jwt',
          notes: 'Test method to verify that session is good.',
          tags: ['api'],
       },
        handler: function(request, reply) {
          reply({
                success: true,
                message: 'User Session Verified'})
          .header("Authorization", request.headers.authorization);
        }
      }, 
      {
        method: 'GET', 
        path: '/restricted', 
        config: { auth: 'jwt' },
        handler: function(request, reply) {
          reply({text: 'You used a Token!'})
          .header("Authorization", request.headers.authorization);
        }
      }
    ]);
});

// Register inert to serve static files
server.register(require('inert'), (err) => {

  if (err) {
    throw err;
  }

  server.route({
    method: 'GET',
    path: '/info',
    handler: function(request, reply) {
      reply.file('./public/info.html');
    }
  });

});

server.register({
  register: require('hapi-require-https'),
  options: {}
});

server.register({
  register: require('hapi-cors'),
  options: {
    origins: ['*'],
    allowCredentials: 'true',
    exposeHeaders: ['content-type', 'content-length'],
    maxAge: 600,
    methods: ['POST, GET, OPTIONS', 'DELETE' ],
    headers: ['Accept', 'Content-Type', 'Authorization']
  }
});

// Register the Application routes
server.register({
    register: app,
    options: {
      message: 'hello app-hapi'
    }
  }, {
    routes: {
      prefix: '/app'
    }
  },
  (err) => {
    if (err) {
      console.log("Error registering app-hapi:" + err);
    }
  });

// Register the Accounting routes
server.register({
    register: acct,
    options: {
      message: 'hello plaz4-acct-hapi'
    }
  }, {
    routes: {
      prefix: '/acct'
    }
  },
  (err) => {
    if (err) {
      console.log("Error registering plaz4-acct-hapi:" + err);
    }
  });

server.register({
  register: Good,
  options: {
    reporters: [{
      reporter: require('good-console'),
      events: {
        response: '*',
        log: '*'
      }
    }]
  }
}, (err) => {

  if (err) {
    throw err; // something bad happened loading the plugin
  }

  server.start((err) => {

    if (err) {
      throw err;
    }
    server.log('info', 'Server running: ' + server.info);
  });
});


// var server1 = http.createServer(function(req, res) {

//       findUserByName("RJOHN", function(data, err) {
//        console.log("Callback"+data);
//       });


//       res.writeHead(200);
//         res.end('Hello Http');
// });
// server.listen(8080);