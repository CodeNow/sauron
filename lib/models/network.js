'use strict';
require('../loadenv.js')();

var ip = require('ip');
var redis = require('./redis.js');
var error = require('../helpers/error.js');
var ipu = require('../helpers/ip-utils.js');

/**
 * allocate new IP for a router
 * @param  {Function} cb (err, newIp)
 */
function createHostAddress (network, cb) {
  redis.hkeys(process.env.WEAVE_NETWORKS+':'+network, function (err, routerIps) {
    if (err) { return cb(err); }
    // if base key not there then network was not allocated
    if (routerIps.length === 0) {
      return cb(error.boom(400, 'network not allocated', {
        network: {
          routerIps: routerIps,
          network: network,
          WEAVE_NETWORK_CIDR: process.env.WEAVE_NETWORK_CIDR
        }
      }));
    }

    var newIp = ipu.getSmallestAvailableHost(routerIps, network, process.env.WEAVE_NETWORK_CIDR);
    if (!newIp) {
      return cb(error.create('could not get new router IP', {
        network: {
          routerIps: routerIps,
          network: network,
          WEAVE_NETWORK_CIDR: process.env.WEAVE_NETWORK_CIDR
        }
      }));
    }

    redis.hsetnx(process.env.WEAVE_NETWORKS+':'+network, newIp, ip.address(),
      function (err, status) {
        if (err) { return cb(err); }
        if (status === '0') {
          // TODO: DATADOG
          return createHostAddress(network, cb);
        }

        return cb(null, newIp);
    });
  });
}

/**
 * remove IP addr from pool
 * @param  {Function} cb (err)
 */
function removeHostAddress (networkIp, hostIp, cb) {
  redis.hdel(process.env.WEAVE_NETWORKS+':'+networkIp, hostIp,
    function (err, status) {
      if (err) { return cb(err); }
      if (status === '0') {
        return cb(error.boom(404, 'host address not found', {
          networkIp: networkIp,
          hostIp: hostIp
        }));
      }
      cb();
    });
}

/**
 * create a network
 * @param  'string'   name name of network
 * @param  {Function} cb   (err, networkIp)
 */
function createNetworkAddress (name, cb) {
  redis.hkeys(process.env.WEAVE_NETWORKS, function (err, networkIps) {
    if (err) { return cb(err); }

    var networkIp = ipu.getLargestAvailableNetwork(networkIps,
      process.env.WEAVE_ROUTER_CIDR, process.env.WEAVE_NETWORK_CIDR);
    if (!networkIp) {
      return cb(error.create('could not create new network'));
    }
    redis.hsetnx(process.env.WEAVE_NETWORKS, networkIp, name, function (err, status) {
      if (err) { return cb(err); }
      if (status === '0') {
        // todo: DATADOG
        return createNetworkAddress(name, cb);
      }

      redis.hsetnx(process.env.WEAVE_NETWORKS+':'+networkIp, networkIp, networkIp,
        function (err, status) {
          if (err) { return cb(err); }
          if (status === '0') {
            // todo: DATADOG
            return createNetworkAddress(name, cb);
          }

          return cb(err, networkIp);
      });
    });
  });
}

/**
 * remove a network, allowing it to be reused
 * @param  'string'   name name of network
 * @param  {Function} cb   (err)
 */
function removeNetworkAddress (networkIp, cb) {
  redis.hdel(process.env.WEAVE_NETWORKS, networkIp,
    function (err, status) {
      if (err) { return cb(err); }
      if (status === '0') {
        return cb(error.boom(404, 'network address not found', {
          networkIp: networkIp
        }));
      }
      cb();
    });
}

/**
 * get array of routers across network
 * @param  {Function} cb (err, [peers])
 */
function getPeers (cb) {
  redis.hvals(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_ROUTER_NETWORK,
    function (err, data) {
      if (err) { return cb(err); }
      // remove base key
      var index = data.indexOf(process.env.WEAVE_ROUTER_NETWORK);
      if (index > -1) {
        data.splice(index, 1);
      }
      return cb(null, data);
    });
}

/**
 * checks to see if an ip is already mapped
 * @param  'string'   routerIp Host Ip
 * @param  {Function} cb       (err, ipaddr)
 *   mapped true if exist, false if not
 */
function getRouterMapping (routerIp, cb) {
  redis.hgetall(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_ROUTER_NETWORK,
    function (err, data) {
      if (err) { return cb(err); }
      var out = '';
      for(var prop in data) {
        if (data.hasOwnProperty(prop) &&
          data[prop] === routerIp) {
          out = prop;
        }
      }
      cb(null, out);
    });
}

/**
 * set router key if not already set
 * @param  'string'   routerIp Host Ip
 * @param  {Function} cb       (err, ipaddr)
 *   mapped true if exist, false if not
 */
function initRouters (cb) {
  redis.hsetnx(process.env.WEAVE_NETWORKS+':'+process.env.WEAVE_ROUTER_NETWORK,
    process.env.WEAVE_ROUTER_NETWORK, process.env.WEAVE_ROUTER_NETWORK, cb);
}

module.exports.getRouterMapping = getRouterMapping;
module.exports.getPeers = getPeers;
module.exports.initRouters = initRouters;

module.exports.createHostAddress = createHostAddress;
module.exports.removeHostAddress = removeHostAddress;

module.exports.createNetworkAddress = createNetworkAddress;
module.exports.removeNetworkAddress = removeNetworkAddress;