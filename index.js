/*
* HEPIC EXPORT Proxy
* (c) QXIP BV
* http://qxip.net
*
* See LICENSE for license details.
*/

var debug = false;
var request = require('request');
var jar = request.jar();
var randomId = Math.random().toString(36).slice(2);
var homercookie = request.cookie("PCAPTURESESSION="+randomId+";path=/");
var homerToken;

/**********************
        OPTIONS
**********************/

var _config_ = require("./config");
if(process.argv.indexOf("-c") != -1){
    _config_ = require(process.argv[process.argv.indexOf("-c") + 1]);
}

var apiUrl = _config_.apiUrl;
var apiSess = _config_.apiSess;
var apiUser = _config_.apiUser;
var apiPass = _config_.apiPass;
var timeOut = _config_.timeOut ? _config_.timeOut : 120 ;

jar.setCookie(homercookie, apiSess, function(error, cookie) {});

/**********************
        FUNCTIONS
**********************/

var authCache = false;
var getAuthCookie = function(setCookie){
    if(authCache) return;
    var headers = {
      "Authorization" : homerToken,
      "Content-Type" : "application/json;charset=UTF-8"

    };    
    var auth = JSON.stringify({ "username": apiUser, "password": apiPass, "auth_type": "local" });
    if (debug) console.log(auth);
    if (setCookie) jar.setCookie(setCookie, apiSess, function(error, cookie) {});
    request({
          uri: apiSess,
          method: "POST",
          form: auth,
          headers: headers,
          jar: jar
        }, function(error, response, body) {
          if (!body) {
                console.log('API Error connecting to '+apiUrl);
                console.log('Exiting...',error);
                process.exit(1);
          } else {
                if (debug) console.log(body);
                if (response.statusCode == 200){
                        var status = JSON.parse(body).auth;
                        if (!status || status != true ){
                                  console.log('API Auth Failure!', status); return;
                        }
                        authCache = true;
                }
          }
    });

    setInterval(function() {
      authCache = false;
    }, timeOut*1000 );

    return;
}

var getAuthJWT = function(setCookie){
    if(authCache) return;
    var auth = { "username": apiUser, "password": apiPass};

    if (debug) console.log(auth);
    var headers = {
      "Authorization" : homerToken,
      "Content-Type" : "application/json;charset=UTF-8"
    };    
    
    request({
          uri: apiSess,
          method: "POST",
          json: auth,
          headers: headers,
          jar: jar
        }, function(error, response, body) {
          if (!body) {
                console.log('API Error connecting to '+apiUrl);
                console.log('Exiting...',error);
                process.exit(1);
          } else {
                if (debug) console.log(body);
                if (response.statusCode == 200){
                        var token = body.token;
                        if (!token){
                                  console.log('API Auth Failure!', token); return;
                        }
                        authCache = true;
                        homerToken = token;
                        return;                        
                }
          }
    });

    setInterval(function() {
      authCache = false;
    }, timeOut*1000 );

    return;
}

/**********************
        AUTH
**********************/

var http = require('http'),
    httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});

proxy.on('proxyReq', function(proxyReq, req, res, options) {
  if (req.headers && req.headers.cookie && !_config_.apiAuthJWT) getAuthCookie(req.headers.cookie);
  else if(_config_.apiAuthJWT) {
      getAuthJWT(res);
      if(authCache && homerToken) proxyReq.setHeader('Authorization', homerToken);
  }
  proxyReq.setHeader('PCAPTUREAUTH', _config_.apiSecret);
  
});

var server = http.createServer(function(req, res) {
 if ( !req.url.startsWith('/share')
        && !req.url.startsWith('/api/v2/share/')
        && !req.url.startsWith('/lib')
        && !req.url.startsWith('/css')
        && !req.url.startsWith('/app')
        && !req.url.startsWith('/templates')
        && !req.url.startsWith('/fonts')
  ){
        res.writeHead(401);
  }
  proxy.web(req, res, {
    target: apiUrl
  });
});

getAuthCookie();
console.log("HEPIC Export Proxy listening on port "+ _config_.proxyPort)
server.listen(_config_.proxyPort);
