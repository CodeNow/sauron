'use strict';
require('../loadenv.js')();

var ip = require('ip');

/**
 * returns smallest host address available in a givin network
 * @param  [array]  used    all used addresses in network
 * @param  'string' network network to check
 * @param  'string' cidr    cidr of network
 * @return 'string'         IP of host, or empty if invalid
 */
function getSmallestAvailableHost (used, network, cidr) {
  var subnet = ip.cidrSubnet(network + '/' + cidr);
  var base = ip.toLong(subnet.firstAddress);
  var range = base + subnet.numHosts;
  for (var i = base; i < range; i++) {
    var testIp = ip.fromLong(i);
    if (!~used.indexOf(testIp)) {
      return testIp;
    }
  }
  return '';
}

/**
 * returns largest network address available
 * @param  [array]  used    all used addresses in network
 * @return 'string'         IP of host, or empty if invalid
 */
function getLargestAvailableNetwork (used, routerCidr, networkCidr) {
  var range = Math.pow(2, networkCidr - routerCidr) - 1;
  for (var i = range; i > 0; i--) {
    var networkIp = ip.fromLong(i * Math.pow(2, 32-networkCidr));
    networkIp = ip.or(process.env.WEAVE_ROUTER_NETWORK, networkIp);
    if (!~used.indexOf(networkIp)) {
      return networkIp;
    }
  }
  return '';
}

/**
 * checks if IP is valid for runnable. 10.x.x.x
 * @return {Boolean} true if valid
 */
function isValidIp (addr) {
  var buffer;
  try {
    buffer = ip.toBuffer(addr);
  } catch(err) {
    return false;
  }
  if (buffer.length !== 4) {
    return false;
  }
  try {
    addr.split('.').forEach(function(item) {
      if (parseInt(item) > 255) {
        throw 'int too big';
      }
    });
  } catch (err) {
    return false;
  }
  return true;
}

module.exports.getSmallestAvailableHost = getSmallestAvailableHost;
module.exports.getLargestAvailableNetwork = getLargestAvailableNetwork;
module.exports.isValidIp = isValidIp;
