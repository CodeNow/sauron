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

module.exports.getSmallestAvailableHost = getSmallestAvailableHost;
module.exports.getLargestAvailableNetworkId = getLargestAvailableNetworkId;
module.exports.networkIdToIp = networkIdToIp;
module.exports.ipToNetworkId = ipToNetworkId;
