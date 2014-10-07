'use strict';
var weave = require('./models/weave.js');
var networkFactory = require('./models/networkFactory.js');
var ip = require('ip');
var error = require('./lib/error.js');

/**
 * setup weave network on the box and add it to global weave network
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
function setup (cb) {
  weave.status(function(err, status) {
    // return if we are already started, or no error
    // if there is an error assume it is not started
    if (!err) {
      return cb(error.create('container already started', status));
    }

    // get router network
    networkFactory.getRouters(function(err, peers) {
      if (err) { return cb(err); }

      networkFactory.checkMapping(ip.address(), function(err, routerIpAddr) {
        if (err) { return cb(err); }

        if (!routerIpAddr) {
          return networkFactory.createHost('10.0.0.0', function(err, routerIpAddr) {
            launchWeave(routerIpAddr, peers, cb);
          });
        }

        launchWeave(routerIpAddr, peers, cb);
      });
    });
  });
}

function launchWeave(routerIpAddr, peers, cb) {
  var options = {
    ipaddr: routerIpAddr,
    subnet: process.env.WEAVE_SUBNET,
    password: process.env.WEAVE_PASSWORD,
    peers: peers
  };

  // launch router on this host
  weave.launch(options, function (err) {
    if (err) {
      networkFactory.removeHost('10.0.0.0', routerIpAddr);
      return cb(err);
    }
  });
}

/**
 * add container to org network
 * @param  "String"   containerId id of container
 * @param  "String"   ipAddr      ip addr to attach
 * @param  "String"   cidr        cidr value
 * @param  {Function} cb          (err)
 */
function attachContainer (containerId, ipAddr, cidr, cb) {
  var options = {
    ipaddr: ipAddr,
    subnet: cidr,
    containerId: containerId,
  };
  weave.attach(options, cb);
}

/**
 * remove container from org network
 * @param  "String"   containerId id of container
 * @param  "String"   ipAddr      ip addr to detach
 * @param  "String"   cidr        cidr value
 * @param  {Function} cb          (err)
 */
function detachContainer (containerId, ipAddr, cidr, cb) {
  var options = {
    ipaddr: ipAddr,
    subnet: cidr,
    containerId: containerId,
  };
  weave.detach(options, cb);
}

function createHostAddress (networkAddr, cb) {
  networkFactory.createHostAddress(networkAddr, cb);
}

function createNetworkAddress (networkAddr, cb) {
  networkFactory.createNetworkAddress(networkAddr, cb);
}

module.exports.setup = setup;
module.exports.attachContainer = attachContainer;
module.exports.detachContainer = detachContainer;
module.exports.createHostAddress = createHostAddress;
module.exports.createNetworkAddress = createNetworkAddress;
