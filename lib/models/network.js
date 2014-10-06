'use strict';
var weave = require('./models/weave.js');
var networkFactory = require('./models/networkFactory.js');
var ip = require('ip');
var error = require('./lib/error.js');

//* Sauron check to see if weave is already running
//  * if running, start listening
//  * if not:
//    * query redis to see what ip's are in use
//    * use unused ip, networks should use 10.0.0.X and link to other hosts
//    * start listening
//

/**
 * setup weave network on the box and add it to global weave network
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
function setup(cb) {
  weave.status(function(err, status) {
    // return if we are already started, or no error
    // if there is an error assume it is not started
    if (!err) {
      return cb(error.create('container already started', status));
    }

    // get router network
    networkFactory.getRouters(function(err, peers) {
      if (err) { return cb(err); }

      var routerIpAddr = peers[ip.address()];
      if (!routerIpAddr) {
        routerIpAddr = networkFactory.getNewRouterIp(peers);
      }

      var options = {
        ipaddr: routerIpAddr,
        subnet: process.env.WEAVE_SUBNET,
        password: process.env.WEAVE_PASSWORD,
        peers: peers
      };

      // launch router on this host
      weave.launch(options, function (err) {
        if (err) {
          networkFactory.removeRouterIp(routerIpAddr);
          return cb(err);
        }
      });
    });
  });
}

module.exports.setup = setup;
module.exports.addContainer = addContainer;
module.exports.removeContainer = removeContainer;
