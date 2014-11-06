'use strict';
require('../loadenv.js')();

var weave = require('../engines/weave-wrapper.js');
var network = require('./network.js');
var ip = require('ip');
var error = require('../helpers/error.js');
var containerIp = require('./network/container-ip.js');

/**
 * setup weave network on the box and add it to global weave network
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
function setup (cb) {
  weave.status(function (err, status) {
    // return if we are already started, or no error
    // if there is an error assume it is not started
    if (!err) {
      return cb(error.create('container already started', status));
    }

    // get router network
    network.getPeers(function (err, peers) {
      if (err) { return cb(err); }

      network.getRouterMapping(ip.address(), function (err, routerIpAddr) {
        if (err) { return cb(err); }
        if (!routerIpAddr) {
          return allocateAndLaunch(peers, cb);
        }
        launchWeave(routerIpAddr, peers, cb);
      });
    });
  });
}

function allocateAndLaunch(peers, cb) {
  network.createHostAddress(process.env.WEAVE_ROUTER_NETWORK, function (err, routerIpAddr) {
    if (err) { return cb(err); }

    launchWeave(routerIpAddr, peers, cb);
  });
}

function launchWeave(routerIpAddr, peers, cb) {
  var options = {
    ipaddr: routerIpAddr,
    subnet: process.env.WEAVE_ROUTER_CIDR + '',
    password: process.env.WEAVE_PASSWORD,
    peers: peers
  };

  // launch router on this host
  weave.launch(options, function (err) {
    if (err) {
      network.removeHostAddress(process.env.WEAVE_ROUTER_NETWORK, routerIpAddr, function () {});
    }

    cb(err);
  });
}

/**
 * add container to org network
 * @param  'String'   containerId id of container
 * @param  'String'   ipAddr      ip addr to attach
 * @param  'String'   cidr        cidr value
 * @param  {Function} cb          (err)
 */
function attachContainer (containerId, ipAddr, cidr, cb) {
  var options = {
    ipaddr: ipAddr,
    subnet: cidr,
    containerId: containerId,
  };
  containerIp.setContainerIp(containerId, ipAddr, function(err) {
    if (err) { return cb(err); }

    weave.attach(options, function(err) {
      if (err) {
        return containerIp.removeContainerIp(containerId, ipAddr,
          function() { return cb(err); });
      }
      return cb();
    });
  });
}

/**
 * remove container from org network
 * @param  'String'   containerId id of container
 * @param  'String'   ipAddr      ip addr to detach
 * @param  'String'   cidr        cidr value
 * @param  {Function} cb          (err)
 */
function detachContainer (containerId, ipAddr, cidr, cb) {
  var options = {
    ipaddr: ipAddr,
    subnet: cidr,
    containerId: containerId,
  };
  containerIp.removeContainerIp(containerId, ipAddr, function(err) {
    if (err) { return cb(err); }
    weave.detach(options, cb);
  });
}


module.exports.setup = setup;
module.exports.attachContainer = attachContainer;
module.exports.detachContainer = detachContainer;