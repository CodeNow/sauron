'use strict';
require('../loadenv.js')();

var redis = require('./redis.js');
var error = require('../error.js');
var ip = require('ip');
var ipu = require('../helpers/ip-utils.js');

/**
 * allocate new IP for a router
 * @param  {Function} cb (err, newIp)
 */
function createHostAddress (network, cb) {
  redis.hvals(process.env.WEAVE_NETWORKS+':'+network, function(err, routerIps) {
    if (err) { return cb(err); }
    var newIp = ipu.getSmallestAvailableHost(routerIps, network, 10);

    if (!newIp) {
      return cb(error.create('could not get new router IP'));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS+':'+network, ip.address(), newIp,
      function(err, status) {
        if (err) { return cb(err); }
        if (status === 0) {
          return createHostAddress(network, cb);
        }

        cb(null, newIp);
    });
  });
}

/**
 * remove IP addr from pool
 * @param  {Function} cb (err)
 */
function removeHostAddress (network, hostIp, cb) {
  redis.hdel(process.env.WEAVE_NETWORKS+':'+network, hostIp, cb);
}

/**
 * create a network
 * @param  'string'   name name of network
 * @param  {Function} cb   (err, networkIp)
 */
function createNetworkAddress (name, cb) {
  redis.hvals(process.env.WEAVE_NETWORKS, function(err, networkIps) {
    if (err) { return cb(err); }

    var networkId = ipu.getLargestAvailableNetworkId(networkIps, process.env.WEAVE_NETWORK_CIDR);
    if (!networkId) {
      return cb(error.create('could not create new network'));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS, networkId, name, function(err, status) {
      if (err) { return cb(err); }
      if (status === 0) {
        return createNetworkAddress(name, cb);
      }

      cb(null, ipu.networkIdToIp(networkId));
    });
  });
}

/**
 * remove a network, allowing it to be reused
 * @param  'string'   name name of network
 * @param  {Function} cb   (err, networkIp)
 */
function removeNetworkAddress (networkIp, cb) {
  var networkId = ipu.ipToNetworkId(networkIp);
  redis.hdel(process.env.WEAVE_ROUTERS, networkId, cb);
}

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
function getRouters (cb) {
  redis.hkeys(process.env.WEAVE_ROUTERS+':'+process.env.WEAVE_ROUTER_NETWORK, cb);
}

/**
 * checks to see if an ip is already mapped
 * @param  'string'   routerIp Host Ip
 * @param  {Function} cb       (err, ipaddr)
 *   mapped true if exist, false if not
 */
function getRouterMapping (routerIp, cb) {
  redis.hget(process.env.WEAVE_ROUTERS+':'+process.env.WEAVE_ROUTER_NETWORK, routerIp, cb);
}

module.exports.getRouterMapping = getRouterMapping;
module.exports.getRouters = getRouters;
module.exports.createHostAddress = createHostAddress;
module.exports.removeHostAddress = removeHostAddress;

module.exports.createNetworkAddress = createNetworkAddress;
module.exports.removeNetworkAddress = removeNetworkAddress;