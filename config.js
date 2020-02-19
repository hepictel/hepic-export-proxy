var config = {
        apiUrl: 'http://my.hepic.server/',
        apiSess: 'http://my.hepic.server/api/v2/session',
        apiAuthJWT: false, //Activate for Homer7 setup
        apiUser: 'admin',
        apiPass: 'password',
        apiSecret: '123456',
        timeOut: 1800, // seconds
        proxyHost: '0.0.0.0',
        proxyPort: 8765
};

module.exports = config;
