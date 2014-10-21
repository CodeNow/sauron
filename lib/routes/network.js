'use strict';
require('../loadenv.js')();

var network = require('../models/network.js');
var ip = require('ip');

/**
 * allocate a network for a group of containers
 * return: { networkIp: 'ip.ip.ip.ip' }
 */
function allocate (req, res, next) {
  var tag = ip.address();
  network.createNetworkAddress(tag, function (err, networkIp) {
    if (err) { return next(err); }
    res.status(200).send({
      networkIp: networkIp
    });
  });
}



module.exports.allocate = allocate;
