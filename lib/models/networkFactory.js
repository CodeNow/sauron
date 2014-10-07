'use strict';
var redis = require('./redis.js');
var error = require('../error.js');
var ip = require('ip.js');

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
function getRouters (cb) {
  redis.hkeys(process.env.WEAVE_ROUTERS+':10.0.0.0', cb);
}

/**
 * checks to see if an ip is already mapped
 * @param  'string'   routerIp Host Ip
 * @param  {Function} cb       (err, ipaddr)
 *   mapped true if exist, false if not
 */
function getRouterMapping (routerIp, cb) {
  redis.hget(process.env.WEAVE_ROUTERS+':10.0.0.0', routerIp, cb);
}

/**
 * allocate new IP for a router
 * @param  {Function} cb (err, newIp)
 */
function createHost (network, cb) {
  redis.hvals(process.env.WEAVE_ROUTERS+':'+network, function(err, routerIps) {
    if (err) { return cb(err); }
    var newIp = getSmallestAvailableHost(routerIps, network, 10);

    if (!newIp) {
      return cb(error.create('could not get new router IP'));
    }

    redis.hsetnx(process.env.WEAVE_ROUTERS+':'+network, ip.address(), newIp, function(err, status) {
      if (err) { return cb(err); }
      if (status === 0) {
        return createHost(network, cb);
      }

      cb(null, newIp);
    });
  });
}

/**
 * remove IP addr from pool
 * @param  {Function} cb (err)
 */
function removeHost (network, hostIp, cb) {
  redis.hdel(process.env.WEAVE_ROUTERS+':'+network, hostIp, cb);
}


function getSmallestAvailableHost (used, network, cidr) {
  var subnet = ip.subnet(network + '/' + cidr);
  var range = subnet.numHosts;
  var base = ip.toLong(subnet.firstAddress);
  for (var i = base; i < range; i++) {
    if (!~range.indexOf(ip.fromLong(i))) {
      return ip.fromLong(i);
    }
  }
  return '';
}

function getLargestAvailableNetwork (used, cidr) {
  var range = Math.pow(2, cidr - 2);
  for (var i = range; i > 0; i--) {
    if (!~range.indexOf(''+i)) {
      return i;
    }
  }
  return '';
}

function createNetworkAddress (org, cb) {
  redis.hvals(process.env.WEAVE_NETWORKS, function(err, networkIps) {
    if (err) { return cb(err); }

    var newNetwork = getLargestAvailableNetwork(networkIps, process.env.CIDR_8);
    if (!newNetwork) {
      return cb(error.create('could not create new network'));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS, org, newNetwork, function(err, status) {
      if (err) { return cb(err); }
      if (status === 0) {
        return createNetworkAddress(cb);
      }

      // 10.0.0.0 = 167772160
      // shift network by number of host bits
      newNetwork = ip.fromLong(newNetwork * Math.pow(2, 32-process.env.CIDR_8) + 167772160);
      cb(null, newNetwork);
    });
  });
}

function removeNetworkAddress (network, cb) {
  var networkId = ip.mask(network, '0');
  networkId = (networkId - 167772160) / Math.pow(2, 32-process.env.CIDR_8);
  redis.hdel(process.env.WEAVE_NETWORKS, networkId, cb);
}


module.exports.getRouterMapping = getRouterMapping;
module.exports.getRouters = getRouters;
module.exports.createHost = createHost;
module.exports.removeHost = removeHost;

module.exports.createNetworkAddress = createNetworkAddress;
module.exports.removeNetworkAddress = removeNetworkAddress;