'use strict';
require('./loadenv.js')();

var redis = require('./redis.js');
var error = require('../error.js');
var ip = require('ip');

/**
 * allocate new IP for a router
 * @param  {Function} cb (err, newIp)
 */
function createHost (network, cb) {
  redis.hvals(process.env.WEAVE_NETWORKS+':'+network, function(err, routerIps) {
    if (err) { return cb(err); }
    var newIp = getSmallestAvailableHost(routerIps, network, 10);

    if (!newIp) {
      return cb(error.create('could not get new router IP'));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS+':'+network, ip.address(), newIp,
      function(err, status) {
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
  redis.hdel(process.env.WEAVE_NETWORKS+':'+network, hostIp, cb);
}

/**
 * returns smallest host address available in a givin network
 * @param  [array]  used    all used addresses in network
 * @param  'string' network network to check
 * @param  'string' cidr    cidr of network
 * @return 'string'         IP of host, or empty if invalid
 */
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

/**
 * returns largest network address available
 * @param  [array]  used    all used addresses in network
 * @param  'string' cidr    cidr of network
 * @return 'string'         IP of host, or empty if invalid
 */
function getLargestAvailableNetworkId (used, cidr) {
  var range = Math.pow(2, cidr - 8);
  for (var i = range; i > 0; i--) {
    if (!~range.indexOf(''+i)) {
      return i;
    }
  }
  return '';
}

/**
 * converts integer to ip form in network location
 * @param  integer  networkId integer form of network
 * @return 'string'           ip address of network
 */
function networkIdToIp (networkId) {
  var networkIp = ip.fromLong(networkId * Math.pow(2, 32-process.env.WEAVE_NETWORK_CIDR));
  return ip.or(process.env.WEAVE_ROUTER_NETWORK, networkIp);
}

/**
 * converts network ip to integer form
 * @param  'string'  ip of network
 * @return  integer  ip address of network
 */
function ipToNetworkId (networkIp) {
  // cut off first octave 10.0.0.0
  var mask = ip.not(ip.fromPrefixLen(process.env.WEAVE_ROUTER_CIDR));
  var networkId = ip.mask(networkIp, mask);
  return ip.toLong(networkId) / Math.pow(2, 32-process.env.WEAVE_NETWORK_CIDR);
}

/**
 * create a network
 * @param  'string'   name name of network
 * @param  {Function} cb   (err, networkIp)
 */
function createNetworkAddress (name, cb) {
  redis.hvals(process.env.WEAVE_NETWORKS, function(err, networkIps) {
    if (err) { return cb(err); }

    var networkId = getLargestAvailableNetworkId(networkIps, process.env.WEAVE_NETWORK_CIDR);
    if (!networkId) {
      return cb(error.create('could not create new network'));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS, networkId, name, function(err, status) {
      if (err) { return cb(err); }
      if (status === 0) {
        return createNetworkAddress(name, cb);
      }

      cb(null, networkIdToIp(networkId));
    });
  });
}

/**
 * remove a network, allowing it to be reused
 * @param  'string'   name name of network
 * @param  {Function} cb   (err, networkIp)
 */
function removeNetworkAddress (networkIp, cb) {
  var networkId = ipToNetworkId(networkIp);
  redis.hdel(process.env.WEAVE_ROUTERS, networkId, cb);
}

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
function getRouters (cb) {
  redis.hkeys(process.env.WEAVE_ROUTERS+process.env.WEAVE_ROUTER_NETWORK, cb);
}

/**
 * checks to see if an ip is already mapped
 * @param  'string'   routerIp Host Ip
 * @param  {Function} cb       (err, ipaddr)
 *   mapped true if exist, false if not
 */
function getRouterMapping (routerIp, cb) {
  redis.hget(process.env.WEAVE_ROUTERS+process.env.WEAVE_ROUTER_NETWORK, routerIp, cb);
}

module.exports.getRouterMapping = getRouterMapping;
module.exports.getRouters = getRouters;
module.exports.createHost = createHost;
module.exports.removeHost = removeHost;

module.exports.createNetworkAddress = createNetworkAddress;
module.exports.removeNetworkAddress = removeNetworkAddress;